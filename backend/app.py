from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import traceback
from notebook_code import run_multi_agent_query
from notebook_code import memory

# Load environment variable
load_dotenv()

app = Flask(__name__)

# Configure CORS to allow requests from frontend
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})


@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze_reviews():
    """Main endpoint for review analysis"""
    
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.json
        print(f"Received request data: {data}")
        
        query = data.get('query')
        brand = data.get('brand')
        min_star = data.get('min_star')
        max_star = data.get('max_star')
        
        # Validate query
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        print(f"Analyzing query: {query}")
        print(f"Brand: {brand}, Min Star: {min_star}, Max Star: {max_star}")
        
        # Call the analysis function
        result = run_multi_agent_query(
            user_query=query,
            brand=brand,
            min_star=min_star,
            max_star=max_star
        )
        
        if "error" in result:
            return jsonify(result), 404
        
        # Extract advisor data with multiple fallback paths
        advisor_data = result.get("advisor", {})
        print(f"Advisor data keys: {list(advisor_data.keys())}")
        
        # Try to get advisor_recommendations, fallback to direct advisor
        advisor_recommendations = advisor_data.get("advisor_recommendations", advisor_data)
        print(f"Advisor recommendations keys: {list(advisor_recommendations.keys())}")
        
        # Extract and format product improvements with impact
        product_improvements = advisor_recommendations.get("product_improvements", [])
        print(f"Found {len(product_improvements)} product improvements")
        
        formatted_recommendations = []
        for rec in product_improvements:
            if isinstance(rec, dict):
                area = rec.get('area', 'General')
                suggestion = rec.get('suggestion', '')
                priority = rec.get('priority', 'medium')
                impact = rec.get('estimated_impact', '')
                
                # Create rich object format for frontend
                rec_obj = {
                    'area': area,
                    'suggestion': suggestion,
                    'priority': priority,
                    'impact': impact
                }
                formatted_recommendations.append(rec_obj)
            else:
                # Handle string format
                formatted_recommendations.append({'suggestion': str(rec), 'priority': 'medium'})
        
        # Extract marketing suggestions
        marketing_suggestions = advisor_recommendations.get("marketing_suggestions", [])
        print(f"Found {len(marketing_suggestions)} marketing suggestions")
        
        # Extract competitive advantages  
        competitive_advantages = advisor_recommendations.get("competitive_advantages", [])
        print(f"Found {len(competitive_advantages)} competitive advantages")
        
        # Extract risk areas
        risk_areas = advisor_recommendations.get("risk_areas", [])
        print(f"Found {len(risk_areas)} risk areas")
        
        # Detect intent
        intent = result.get("intent", "overall")
        print(f"Detected intent: {intent}")
        
        # Get latency metrics
        latency_metrics = result.get("latency_metrics", {})
        eval_metrics = result.get("eval_metrics", {})
        
        # Build advisor object with all recommendations nested properly
        advisor_output = {
            "product_improvements": formatted_recommendations,
            "marketing_suggestions": marketing_suggestions,
            "competitive_advantages": competitive_advantages,
            "risk_areas": risk_areas
        }
        
        # Transform result for frontend compatibility
        response_data = {
            "query": result.get("query"),
            "intent": intent,
            "summary": result.get("summary", {}),
            "feature_analysis": result.get("feature_analysis", {}),
            "advisor": advisor_output,  # Nest everything under advisor
            "recommendations": formatted_recommendations,  # Also keep at top level for compatibility
            "marketing_suggestions": marketing_suggestions,
            "competitive_advantages": competitive_advantages,
            "risk_areas": risk_areas,
            "metrics": {
                "reviews_retrieved": result.get("retrieved_count", 0),
                "avg_rating": result.get("summary", {}).get("rating_stats", {}).get("average"),
                "total_latency": latency_metrics.get("total_latency", 0),
                "retrieval_precision": eval_metrics.get("retrieval_precision", 0),
                "rating_accuracy": eval_metrics.get("rating_accuracy", 0)
            },
            "performance_metrics": {
                "total_latency": latency_metrics.get("total_latency", 0),
                "feature_extraction_time": latency_metrics.get("feature_extraction_time", 0),
                "retrieval_time": latency_metrics.get("retrieval_time", 0),
                "feature_analysis_time": latency_metrics.get("feature_analysis_time", 0),
                "summary_time": latency_metrics.get("summary_time", 0),
                "faithfulness_time": latency_metrics.get("faithfulness_time", 0),
                "advisor_time": latency_metrics.get("advisor_time", 0),
                "evaluation_time": latency_metrics.get("evaluation_time", 0),
                "retrieval_count": result.get("retrieved_count", 0),
                "retrieval_precision": eval_metrics.get("retrieval_precision", 0),
                "rating_accuracy": eval_metrics.get("rating_accuracy", 0),
                "faithfulness_score": eval_metrics.get("improved_faithfulness", 0),
                "suggestions_generated": len(formatted_recommendations) + len(marketing_suggestions)
            },
            "total_reviews": result.get("retrieved_count", 0),
            "avg_rating": result.get("summary", {}).get("rating_stats", {}).get("average"),
            "overall_sentiment": result.get("summary", {}).get("rating_stats", {}).get("sentiment_percentages")
        }
        
        print(f"Analysis completed successfully")
        print(f"Sending: {len(formatted_recommendations)} recommendations, {len(marketing_suggestions)} marketing, {len(competitive_advantages)} advantages, {len(risk_areas)} risks")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        print(f"Error in analyze_reviews: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'details': 'An error occurred during analysis. Check server logs for details.'
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Backend is running',
    }), 200


@app.route('/api/memory/stats', methods=['GET'])
def get_memory_stats():
    """Get memory and cache statistics"""
    try:
        # Get basic stats
        query_history = memory.long_term.get('query_history', [])
        brands = memory.long_term.get('brands', [])
        cache = memory.long_term.get('query_cache', {})
        summaries = memory.long_term.get('summary_history', [])
        complete_analyses = memory.long_term.get('complete_analyses', [])
        
        # Format cached queries
        cached_queries = []
        for cache_key, cache_data in cache.items():
            parts = cache_key.split('|')
            if len(parts) == 4:
                query, brand, min_star, max_star = parts
                cached_queries.append({
                    'query': query,
                    'filters': f"{min_star}-{max_star} stars" + (f", {brand}" if brand != 'None' else ""),
                    'cached_at': cache_data.get('cached_at'),
                    'access_count': cache_data.get('access_count', 1)
                })
        
        # Format query history
        formatted_history = []
        for q in query_history[-20:]:
            query_text = q.get('query', '')
            # Check if this query is cached
            is_cached = any(cache_key.startswith(query_text.lower()) for cache_key in cache.keys())
            formatted_history.append({
                'query': query_text,
                'timestamp': q.get('timestamp', ''),
                'cached': is_cached
            })
        
        return jsonify({
            'total_queries': len(query_history),
            'total_cached': len(cache),
            'brands_tracked': len(brands),
            'summaries_stored': len(complete_analyses),
            'cache_hit_rate': round((len(cache) / max(len(query_history), 1)) * 100, 1),
            'query_history': list(reversed(formatted_history)),
            'cached_queries': cached_queries,
            'brands': brands
        }), 200
    except Exception as e:
        print(f"Error getting memory stats: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to get memory stats',
            'details': str(e)
        }), 500


@app.route('/api/memory/clear', methods=['POST'])
def clear_memory_cache():
    """Clear memory (short-term or all)"""
    try:
        data = request.json or {}
        clear_type = data.get('type', 'short_term')
        
        if clear_type == 'all':
            # Clear everything
            memory.clear_memory()
            message = 'All memory cleared successfully'
        else:
            # Clear only short-term
            memory.clear_short_term()
            message = 'Short-term memory cleared successfully'
        
        return jsonify({
            'status': 'success',
            'message': message
        }), 200
        
    except Exception as e:
        print(f"Error clearing memory: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to clear memory',
            'details': str(e)
        }), 500


@app.route('/api/memory/export', methods=['POST'])
def export_memory():
    """Export memory to file"""
    try:
        export_path = memory.export_memory()
        
        if export_path:
            return jsonify({
                'status': 'success',
                'message': 'Memory exported successfully',
                'file_path': export_path
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to export memory'
            }), 500
            
    except Exception as e:
        print(f"Error exporting memory: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to export memory',
            'details': str(e)
        }), 500


@app.route('/api/memory/analysis', methods=['POST'])
def get_query_analysis():
    """Get complete analysis for a specific query"""
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        analysis = memory.get_analysis_by_query(query)
        
        if analysis:
            return jsonify(analysis), 200
        else:
            return jsonify({'error': 'Analysis not found for this query'}), 404
            
    except Exception as e:
        print(f"Error retrieving analysis: {e}")
        traceback.print_exc()
        return jsonify({
            'error': 'Failed to retrieve analysis',
            'details': str(e)
        }), 500


@app.route('/', methods=['GET'])
def home():
    """Root endpoint"""
    return jsonify({
        'message': 'WatchSense AI Backend',
        'status': 'running',
        'endpoints': {
            '/api/analyze': 'POST - Analyze customer reviews',
            '/api/health': 'GET - Health check',
            '/api/memory/stats': 'GET - Get memory statistics',
            '/api/memory/clear': 'POST - Clear memory',
            '/api/memory/export': 'POST - Export memory',
            '/api/memory/analysis': 'POST - Get analysis details'
        }
    }), 200


@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)