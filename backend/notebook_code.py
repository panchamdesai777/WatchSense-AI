import os
import json
import pandas as pd
import numpy as np
import time
from typing import TypedDict, Dict, Any, Optional
from datetime import datetime

from sentence_transformers import SentenceTransformer
import faiss
from groq import Groq
from dotenv import load_dotenv

# Load .env file (works locally)
load_dotenv()


# Get API key from environment variable
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# LangGraph
from langgraph.graph import StateGraph, END

from memory_manager import EnhancedMemoryManager

# Validate it exists
if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY not found in environment variables. "
        "Set it in .env locally or in Render dashboard for production."
    )


# # Initialize
# os.environ["GROQ_API_KEY"] = "PASS YOUR API KEY"

# Load FAISS index and embeddings
index = faiss.read_index("faiss_index.bin")
emb_norm = np.load("embeddings.npy")
map_df = pd.read_csv("mapping.csv", index_col=0)
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# Initialize Groq
groq_client = Groq(api_key=GROQ_API_KEY)
GROQ_MODEL = "llama-3.3-70b-versatile"

# Initialize memory
memory = EnhancedMemoryManager()

# Top K for complaints/praises
TOP_K = 5

def groq_chat(system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
    """Wrapper around Groq chat completions."""
    params = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.3
    }
    
    if json_mode:
        params["response_format"] = {"type": "json_object"}
    
    resp = groq_client.chat.completions.create(**params)
    return resp.choices[0].message.content


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def detect_query_intent(query: str) -> str:
    """Detect if the query is looking for negative, positive, or overall feedback."""
    q = query.lower()
    
    negative_keywords = [
        'issue', 'problem', 'complaint', 'negative', 'bad', 'poor', 'worst',
        'hate', 'dislike', 'disappointed', 'broken', 'fail', 'wrong', 'defect',
        'flaw', 'concern', 'drawback', 'downside', 'weakness', 'lacking'
    ]
    
    positive_keywords = [
        'positive', 'good', 'great', 'best', 'love', 'excellent', 'amazing',
        'perfect', 'praise', 'strength', 'advantage', 'benefit', 'like',
        'appreciate', 'impressed', 'satisfied', 'happy'
    ]
    
    if any(word in q for word in negative_keywords):
        return "negative"
    
    if any(word in q for word in positive_keywords):
        return "positive"
    
    return "overall"


def build_reviews_snippet(reviews_df: pd.DataFrame, max_reviews: int = 40) -> str:
    """Convert reviews to text format."""
    rows = []
    for _, r in reviews_df.head(max_reviews).iterrows():
        rows.append(f"- [{r['star_rating']}] {r['review_body']}")
    return "\n".join(rows)


def analyze_features(reviews_df: pd.DataFrame, memory: EnhancedMemoryManager) -> Dict[str, Any]:
    """Extract and analyze specific watch features."""
    feature_keywords = {
        "strap": ["strap", "band", "bracelet", "leather", "metal", "rubber"],
        "battery": ["battery", "charge", "power", "charging"],
        "display": ["display", "screen", "lcd", "digital", "analog", "face"],
        "design": ["design", "style", "look", "appearance", "aesthetic"],
        "durability": ["durable", "quality", "break", "scratch", "damage", "broken"],
        "comfort": ["comfort", "comfortable", "fit", "wear", "heavy", "light"],
        "water_resistance": ["water", "waterproof", "resistant", "swim", "shower"]
    }
    
    feature_analysis = {}
    for feature, keywords in feature_keywords.items():
        pattern = '|'.join(keywords)
        relevant_reviews = reviews_df[
            reviews_df['review_body'].str.contains(pattern, case=False, na=False)
        ]
        
        if not relevant_reviews.empty:
            avg_rating = relevant_reviews['star_rating'].mean()
            positive = len(relevant_reviews[relevant_reviews['star_rating'] >= 4])
            negative = len(relevant_reviews[relevant_reviews['star_rating'] <= 2])
            
            feature_analysis[feature] = {
                "mention_count": len(relevant_reviews),
                "avg_rating": round(avg_rating, 2),
                "sentiment": {
                    "positive": positive,
                    "negative": negative,
                    "neutral": len(relevant_reviews) - positive - negative
                },
                "sample_reviews": relevant_reviews['review_body'].head(3).tolist()
            }
    
    memory.update_short_term(feature_analysis=feature_analysis)
    return feature_analysis


def evaluate_system_performance(
    query: str,
    retrieved_reviews: pd.DataFrame,
    summary: Dict[str, Any],
    advisor: Dict[str, Any]
) -> Dict[str, Any]:
    """Evaluate system performance with various metrics."""
    metrics: Dict[str, Any] = {}
    relevant_count = len(retrieved_reviews)
    metrics["retrieval_count"] = relevant_count
    metrics["retrieval_precision"] = min(1.0, relevant_count / 40)  # target ~40 reviews
    
    summary_text = json.dumps(summary)
    sample_review_words = set()
    for review in retrieved_reviews['review_body'].head(10):
        sample_review_words.update(str(review).lower().split())
    
    summary_words = set(summary_text.lower().split())
    overlap = len(sample_review_words.intersection(summary_words))
    metrics["summary_faithfulness_proxy"] = min(1.0, overlap / 100)
    
    actual_avg = retrieved_reviews['star_rating'].mean()
    summary_avg = summary.get("rating_stats", {}).get("average", 0)
    metrics["rating_accuracy"] = 1 - abs(actual_avg - summary_avg) / 5.0
    
    improvements = advisor.get("product_improvements", [])
    marketing = advisor.get("marketing_suggestions", [])
    metrics["suggestions_generated"] = len(improvements) + len(marketing)
    
    return metrics


def calculate_better_faithfulness(
    retrieved_reviews: pd.DataFrame,
    summary: Dict[str, Any]
) -> Dict[str, Any]:
    """Calculate improved faithfulness score by verifying complaints and praises."""
    review_texts = ' '.join(
        retrieved_reviews['review_body'].head(20).astype(str).tolist()
    )
    
    complaints = summary.get('top_complaints', [])
    praises = summary.get('top_praises', [])
    
    verified_complaints = 0
    complaint_details = []
    
    for complaint in complaints:
        if isinstance(complaint, dict):
            complaint_text = str(complaint.get('complaint', complaint.get('issue', complaint)))
        else:
            complaint_text = str(complaint)
        
        key_words = [
            w for w in complaint_text.lower().split()
            if len(w) > 3 and w not in ['very', 'much', 'good', 'about', 'with', 'this', 'that']
        ][:3]
        
        found = any(word in review_texts.lower() for word in key_words)
        if found:
            verified_complaints += 1
        
        complaint_details.append({
            'text': complaint_text[:60],
            'keywords': key_words,
            'verified': found,
        })
    
    verified_praises = 0
    praise_details = []
    
    for praise in praises:
        if isinstance(praise, dict):
            praise_text = str(praise.get('praise', praise.get('feature', praise)))
        else:
            praise_text = str(praise)
        
        key_words = [
            w for w in praise_text.lower().split()
            if len(w) > 3 and w not in ['very', 'much', 'good', 'about', 'with', 'this', 'that']
        ][:3]
        
        found = any(word in review_texts.lower() for word in key_words)
        if found:
            verified_praises += 1
        
        praise_details.append({
            'text': praise_text[:60],
            'keywords': key_words,
            'verified': found,
        })
    
    total_items = len(complaints) + len(praises)
    verified_items = verified_complaints + verified_praises
    faithfulness_score = verified_items / total_items if total_items > 0 else 0
    
    return {
        "improved_faithfulness": round(faithfulness_score, 3),
        "complaints_verified": f"{verified_complaints}/{len(complaints) or 1}",
        "praises_verified": f"{verified_praises}/{len(praises) or 1}",
        "overall_verification": f"{verified_items}/{total_items or 1}",
        "complaint_details": complaint_details,
        "praise_details": praise_details,
        "score_percentage": round(faithfulness_score * 100, 1)
    }


# ============================================================================
# AGENT FUNCTIONS
# ============================================================================

def extract_product_features(query: str) -> Dict[str, Any]:
    """Extract product type, material, brand from query using LLM."""
    system_prompt = """
    Extract product features from the user query.
    Return JSON with:
    - brand: extracted brand name (or null)
    - material: material mentioned (leather, metal, rubber, etc.)
    - watch_type: type of watch (digital, analog, smart, sport, etc.)
    - features_mentioned: list of features (battery, strap, display, design, etc.)
    """
    
    result = groq_chat(system_prompt, query, json_mode=True)
    return json.loads(result)


def retrieve_reviews(
    query: str,
    memory: EnhancedMemoryManager,
    k: int = 40,
    brand: Optional[str] = None,
    min_star: Optional[int] = None,
    max_star: Optional[int] = None
) -> pd.DataFrame:
    """
    Deterministic tool:
    - uses embeddings + FAISS for semantic search (no randomness)
    """
    memory.add_query(query)
    
    q_emb = embed_model.encode([query], convert_to_numpy=True)
    q_emb = q_emb / np.linalg.norm(q_emb, axis=1, keepdims=True)
    
    D, I = index.search(q_emb, k)
    indices = I[0]
    scores = D[0]
    
    memory.update_short_term(last_query=query, retrieved_ids=indices.tolist())
    
    results = map_df.iloc[indices].copy()
    results["score"] = scores
    
    if brand:
        memory.add_brand(brand)
        results = results[
            results["detected_brand"].str.lower() == brand.lower()
        ]
    
    if min_star is not None:
        results = results[results["star_rating"] >= min_star]
    
    if max_star is not None:
        results = results[results["star_rating"] <= max_star]
    
    return results


def summarize_reviews_agent(
    reviews_df: pd.DataFrame,
    query_text: str,
    memory: EnhancedMemoryManager
) -> Dict[str, Any]:
    """Summarize reviews with enhanced analysis and intent detection."""
    
    # Detect Query Intent
    intent = detect_query_intent(query_text)
    memory.update_short_term(intent=intent)
    
    if intent == "negative":
        focus_instruction = "Focus mainly on recurring complaints. Complaints should be more detailed than praises."
    elif intent == "positive":
        focus_instruction = "Focus mainly on recurring praises. Praises should be more detailed than complaints."
    else:
        focus_instruction = "Provide a balanced view of both praises and complaints."
    
    # Prepare Review Text
    reviews_text = build_reviews_snippet(reviews_df)
    
    # Compute Rating Stats
    rating_dist = reviews_df['star_rating'].value_counts().to_dict()
    avg_rating = reviews_df['star_rating'].mean()
    total_reviews = len(reviews_df)
    
    positive_pct = len(reviews_df[reviews_df['star_rating'] >= 4]) / total_reviews * 100
    negative_pct = len(reviews_df[reviews_df['star_rating'] <= 2]) / total_reviews * 100
    neutral_pct = 100 - positive_pct - negative_pct
    
    # SYSTEM PROMPT
    system_prompt = f"""
You are a Review Summarizer Agent for watch products.

User Intent: {intent}
Instruction: {focus_instruction}

Your task is to extract insights from customer reviews.

Return ONLY a JSON object with the following fields:

1. "top_complaints": list of the top {TOP_K} recurring complaints
2. "top_praises": list of the top {TOP_K} recurring praises
3. "summary_text": a concise 3–5 sentence summary
4. "rating_stats": an object containing:
    - "average": {avg_rating:.2f}
    - "distribution": the rating distribution dictionary
    - "total_reviews": {total_reviews}
    - "sentiment_percentages":
        - "positive": {round(positive_pct,1)}
        - "negative": {round(negative_pct,1)}
        - "neutral": {round(neutral_pct,1)}

Do NOT include explanations, markdown, or commentary.
Return ONLY valid JSON.
"""
    
    # USER PROMPT
    user_prompt = f"""
Query: {query_text}

Here are the customer reviews:
{reviews_text}
"""
    
    # Call LLM in JSON mode
    summary_json_str = groq_chat(
        system_prompt,
        user_prompt,
        json_mode=True
    )
    summary = json.loads(summary_json_str)
    
    # Enforce Correct Rating Stats
    summary["rating_stats"] = {
        "average": round(avg_rating, 2),
        "distribution": rating_dist,
        "total_reviews": total_reviews,
        "sentiment_percentages": {
            "positive": round(positive_pct, 1),
            "negative": round(negative_pct, 1),
            "neutral": round(neutral_pct, 1)
        }
    }
    
    # Update Memory
    memory.update_short_term(summary=summary)
    memory.add_summary(summary, query_text, None)

    return summary


def advisor_agent(
    summary: Dict[str, Any],
    feature_analysis: Dict[str, Any],
    brand: Optional[str],
    memory: EnhancedMemoryManager
) -> Dict[str, Any]:
    """Generate actionable recommendations with intent awareness."""
    
    # Get user intent from memory
    intent = memory.short_term.get("intent", "overall")
    
    if intent == "negative":
        advisor_focus = "Prioritize product improvements addressing customer complaints and vulnerabilities."
    elif intent == "positive":
        advisor_focus = "Focus more on praises and strengths for marketing opportunities."
    else:
        advisor_focus = "Provide a balanced set of improvements and marketing ideas."
    
    # SYSTEM PROMPT
    system_prompt = f"""
You are an Action-Advisor Agent for product improvement.

User Intent: {intent}
Instruction: {advisor_focus}

You must generate ONLY a JSON object with these fields:

1. "product_improvements": 3–5 highly actionable improvements
    Each item must include:
    - "area": which feature or domain it impacts
    - "suggestion": clear recommended action
    - "priority": "high" | "medium" | "low"
    - "estimated_impact": estimated improvement outcome

2. "marketing_suggestions": 3–5 marketing strategies
    Each item must include:
    - "strategy"
    - "suggestion"
    - "target_audience"
    - "expected_outcome"

3. "competitive_advantages": key strengths from customer feedback

4. "risk_areas": critical issues that could harm brand reputation

Return ONLY valid JSON. No explanations, no markdown.
"""
    
    # USER PROMPT
    user_prompt = f"""
Brand: {brand or "General Watch Category"}

Review Summary:
{json.dumps(summary, indent=2)}

Feature Analysis:
{json.dumps(feature_analysis, indent=2)}
"""
    
    advisor_json_str = groq_chat(system_prompt, user_prompt, json_mode=True)
    advisor = json.loads(advisor_json_str)
    
    memory.update_short_term(advisor=advisor)
    memory.add_summary({
        "advisor_recommendations": advisor,
        "query": memory.short_term.get("last_query", "")
    })
    memory.save_long_term()
    
    return advisor


# ============================================================================
# LANGGRAPH STATE AND NODES
# ============================================================================

class SentimentState(TypedDict, total=False):
    user_query: str
    brand: Optional[str]
    min_star: Optional[int]
    max_star: Optional[int]
    
    extracted_features: Dict[str, Any]
    retrieved: pd.DataFrame
    summary: Dict[str, Any]
    feature_analysis: Dict[str, Any]
    advisor: Dict[str, Any]
    eval_metrics: Dict[str, Any]
    latency_metrics: Dict[str, float]
    faithfulness: Dict[str, Any]
    memory_context: Dict[str, Any]


def node_extract_features(state: SentimentState) -> SentimentState:
    """Extract product features from query."""
    start = time.time()
    query = state["user_query"]
    
    extracted = extract_product_features(query)
    brand = state.get("brand") or extracted.get("brand")
    elapsed = time.time() - start
    
    latency = state.get("latency_metrics", {})
    latency["feature_extraction_time"] = round(elapsed, 3)
    
    state["extracted_features"] = extracted
    state["brand"] = brand
    state["latency_metrics"] = latency
    return state


def node_retrieve(state: SentimentState) -> SentimentState:
    """Retrieve relevant reviews."""
    start = time.time()
    retrieved = retrieve_reviews(
        query=state["user_query"],
        memory=memory,
        k=60,
        brand=state.get("brand"),
        min_star=state.get("min_star"),
        max_star=state.get("max_star"),
    )
    elapsed = time.time() - start
    
    latency = state.get("latency_metrics", {})
    latency["retrieval_time"] = round(elapsed, 3)
    
    state["retrieved"] = retrieved
    state["latency_metrics"] = latency
    return state


def node_summarize(state: SentimentState) -> SentimentState:
    """Summarize reviews."""
    start = time.time()
    retrieved = state["retrieved"]
    summary = summarize_reviews_agent(retrieved, state["user_query"], memory)
    elapsed = time.time() - start
    
    latency = state.get("latency_metrics", {})
    latency["summary_time"] = round(elapsed, 3)
    
    state["summary"] = summary
    state["latency_metrics"] = latency
    return state


def node_feature_analysis(state: SentimentState) -> SentimentState:
    """Analyze features."""
    start = time.time()
    feature_analysis = analyze_features(state["retrieved"], memory)
    elapsed = time.time() - start
    
    latency = state.get("latency_metrics", {})
    latency["feature_analysis_time"] = round(elapsed, 3)
    
    state["feature_analysis"] = feature_analysis
    state["latency_metrics"] = latency
    return state


def node_faithfulness(state: SentimentState) -> SentimentState:
    """Calculate faithfulness score."""
    start = time.time()
    faith = calculate_better_faithfulness(state["retrieved"], state["summary"])
    elapsed = time.time() - start
    
    latency = state.get("latency_metrics", {})
    latency["faithfulness_time"] = round(elapsed, 3)
    
    state["faithfulness"] = faith
    state["latency_metrics"] = latency
    return state


def node_advisor(state: SentimentState) -> SentimentState:
    """Generate advisor recommendations."""
    start = time.time()
    advisor = advisor_agent(
        summary=state["summary"],
        feature_analysis=state["feature_analysis"],
        brand=state.get("brand"),
        memory=memory
    )
    elapsed = time.time() - start
    
    latency = state.get("latency_metrics", {})
    latency["advisor_time"] = round(elapsed, 3)
    
    state["advisor"] = advisor
    state["latency_metrics"] = latency
    return state


def node_evaluate_and_memory(state: SentimentState) -> SentimentState:
    """Evaluate system performance and update memory."""
    start = time.time()
    eval_metrics = evaluate_system_performance(
        query=state["user_query"],
        retrieved_reviews=state["retrieved"],
        summary=state["summary"],
        advisor=state["advisor"]
    )
    # merge improved faithfulness
    if "faithfulness" in state:
        eval_metrics["improved_faithfulness"] = state["faithfulness"]["improved_faithfulness"]
    
    elapsed = time.time() - start
    
    latency = state.get("latency_metrics", {})
    latency["evaluation_time"] = round(elapsed, 3)
    latency["total_latency"] = round(sum(v for v in latency.values()), 3)
    
    state["eval_metrics"] = eval_metrics
    state["latency_metrics"] = latency
    state["memory_context"] = memory.get_context()
    
    # NEW: Save complete analysis to memory
    memory.save_complete_analysis({
        "query": state["user_query"],
        "intent": memory.short_term.get("intent", "overall"),
        "summary": state["summary"],
        "feature_analysis": state["feature_analysis"],
        "advisor": state["advisor"],
        "metrics": eval_metrics,
        "latency": latency,
        "timestamp": str(datetime.now())
    })
    
    # write metrics to long-term
    memory.add_performance_metric({
        **eval_metrics,
        **latency,
        "query": state["user_query"],
        "brand": state.get("brand")
    })
    memory.save_long_term()
    return state

# ============================================================================
# BUILD LANGGRAPH WORKFLOW
# ============================================================================

def build_workflow():
    """Build and compile the LangGraph workflow."""
    graph = StateGraph(SentimentState)
    
    graph.add_node("extract_features", node_extract_features)
    graph.add_node("retrieve", node_retrieve)
    graph.add_node("summarize", node_summarize)
    graph.add_node("feature_analysis", node_feature_analysis)
    graph.add_node("faithfulness", node_faithfulness)
    graph.add_node("advisor", node_advisor)
    graph.add_node("evaluate_memory", node_evaluate_and_memory)
    
    # Edges (pipeline)
    graph.set_entry_point("extract_features")
    graph.add_edge("extract_features", "retrieve")
    graph.add_edge("retrieve", "feature_analysis")
    graph.add_edge("feature_analysis", "summarize")
    graph.add_edge("summarize", "faithfulness")
    graph.add_edge("faithfulness", "advisor")
    graph.add_edge("advisor", "evaluate_memory")
    graph.add_edge("evaluate_memory", END)
    
    app = graph.compile()
    
    print("LangGraph multi-agent workflow compiled.")
    return app


# ============================================================================
# MAIN EXECUTION FUNCTION
# ============================================================================

def run_multi_agent_query(
    user_query: str,
    brand: Optional[str] = None,
    min_star: Optional[int] = None,
    max_star: Optional[int] = None
) -> Dict[str, Any]:
    """
    Complete multi-agent pipeline with performance tracking using LangGraph.
    
    Args:
        user_query: User's query string
        brand: Optional brand filter
        min_star: Optional minimum star rating filter
        max_star: Optional maximum star rating filter
    
    Returns:
        Dictionary containing all results and metrics
    """
    # Build the workflow
    app = build_workflow()
    
    # Initial state
    initial_state: SentimentState = {
        "user_query": user_query,
        "brand": brand,
        "min_star": min_star,
        "max_star": max_star,
    }
    
    # Run the workflow
    result_state = app.invoke(initial_state)
    
    # Check if retrieval failed
    if result_state["retrieved"].empty:
        return {"error": "No matching reviews found."}
    
    return {
        "query": user_query,
        "intent": memory.short_term.get("intent", "overall"),
        "extracted_features": result_state["extracted_features"],
        "summary": result_state["summary"],
        "feature_analysis": result_state["feature_analysis"],
        "advisor": result_state["advisor"],
        "latency_metrics": result_state["latency_metrics"],
        "eval_metrics": result_state["eval_metrics"],
        "faithfulness": result_state["faithfulness"],
        "retrieved_count": len(result_state["retrieved"])
    }
