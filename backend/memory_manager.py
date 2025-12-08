import os
import json
from datetime import datetime
from typing import Dict, Any


class EnhancedMemoryManager:
    """
    Enhanced Memory Manager with short-term and long-term memory.
    
    Short-term memory: Holds current conversation context (query, summaries, etc.)
    Long-term memory: Persists to JSON file for historical tracking
    """
    
    def __init__(self, file_path: str = "memory.json"):
        self.file_path = file_path
        self.short_term = {
            "last_query": None,
            "retrieved_ids": [],
            "summary": None,
            "advisor": None,
            "feature_analysis": None,
            "latency_metrics": None,
            "intent": None,  # Added intent tracking
        }
        self.long_term = self._load_long_term()
        self._ensure_keys()

    def _get_default_structure(self) -> Dict[str, Any]:
        """Get default memory structure."""
        return {
            "query_history": [],
            "product_categories": [],
            "brands": [],
            "accepted_suggestions": [],
            "rejected_suggestions": [],
            "summary_history": [],
            "suggestion_ratings": [],
            "performance_metrics": []
        }

    def _load_long_term(self) -> Dict[str, Any]:
        """Load long-term memory from file."""
        if not os.path.exists(self.file_path):
            return self._get_default_structure()
        try:
            with open(self.file_path, "r") as f:
                data = json.load(f)
            return data
        except Exception as e:
            print(f"Error loading memory file: {e}")
            return self._get_default_structure()

    def _ensure_keys(self):
        """Ensure all required keys exist in long_term memory."""
        default_structure = self._get_default_structure()
        for key, default_value in default_structure.items():
            if key not in self.long_term:
                self.long_term[key] = default_value
                print(f"Added missing key '{key}' to memory")

    def save_long_term(self):
        """Save long-term memory to file."""
        try:
            with open(self.file_path, "w") as f:
                json.dump(self.long_term, f, indent=2)
        except Exception as e:
            print(f"Error saving memory file: {e}")
    
    def save_complete_analysis(self, analysis_data: Dict[str, Any]):
        """Save complete analysis data including all details."""
        if "complete_analyses" not in self.long_term:
            self.long_term["complete_analyses"] = []
        
        self.long_term["complete_analyses"].append(analysis_data)
        self.save_long_term()

    def get_analysis_by_query(self, query: str) -> Dict[str, Any]:
        """Retrieve complete analysis for a specific query."""
        analyses = self.long_term.get("complete_analyses", [])
        # Find the most recent analysis matching this query
        for analysis in reversed(analyses):
            if analysis.get("query", "").lower() == query.lower():
                return analysis
        return None
    
    def save_complete_analysis(self, analysis_data: Dict[str, Any]):
        """Save complete analysis data including all details."""
        if "complete_analyses" not in self.long_term:
            self.long_term["complete_analyses"] = []
        
        self.long_term["complete_analyses"].append(analysis_data)
        
        # Also update summary_history for backward compatibility
        if analysis_data.get("summary"):
            self.long_term["summary_history"].append({
                "query": analysis_data.get("query"),
                "summary": analysis_data.get("summary"),
                "timestamp": analysis_data.get("timestamp")
            })
        
        self.save_long_term()

    def get_analysis_by_query(self, query: str) -> Dict[str, Any]:
        """Retrieve complete analysis for a specific query."""
        analyses = self.long_term.get("complete_analyses", [])
        # Find the most recent analysis matching this query
        for analysis in reversed(analyses):
            if analysis.get("query", "").lower() == query.lower():
                return analysis
        return None

    # ========================================================================
    # LONG-TERM MEMORY UPDATES
    # ========================================================================

    def add_query(self, query: str):
        """Add query to history."""
        self.long_term["query_history"].append({
            "query": query,
            "timestamp": str(datetime.now())
        })

    def add_brand(self, brand: str):
        """Add brand to tracking."""
        if brand and brand not in self.long_term["brands"]:
            self.long_term["brands"].append(brand)

    def add_category(self, title: str):
        """Add product category to tracking."""
        if title and title not in self.long_term["product_categories"]:
            self.long_term["product_categories"].append(title)

    def add_summary(self, summary: Dict[str, Any], query: str = None, feature_analysis: Dict[str, Any] = None):
        """Add complete analysis summary to history."""
        self.long_term["summary_history"].append({
            "query": query or self.short_term.get("last_query", ""),
            "summary": summary,
            "feature_analysis": feature_analysis,
            "timestamp": str(datetime.now())
        })

    def add_suggestion_rating(self, suggestion: str, rating: int, category: str):
        """Track suggestion ratings from users."""
        self.long_term["suggestion_ratings"].append({
            "suggestion": suggestion,
            "rating": rating,
            "category": category,
            "timestamp": str(datetime.now())
        })

    def add_performance_metric(self, metrics: Dict[str, Any]):
        """Track system performance over time."""
        if "performance_metrics" not in self.long_term:
            self.long_term["performance_metrics"] = []
        
        self.long_term["performance_metrics"].append({
            "metrics": metrics,
            "timestamp": str(datetime.now())
        })

    def accept_suggestion(self, suggestion: str, category: str):
        """Mark a suggestion as accepted."""
        self.long_term["accepted_suggestions"].append({
            "suggestion": suggestion,
            "category": category,
            "timestamp": str(datetime.now())
        })
        self.save_long_term()

    def reject_suggestion(self, suggestion: str, category: str, reason: str = None):
        """Mark a suggestion as rejected."""
        entry = {
            "suggestion": suggestion,
            "category": category,
            "timestamp": str(datetime.now())
        }
        if reason:
            entry["reason"] = reason
        self.long_term["rejected_suggestions"].append(entry)
        self.save_long_term()

    # ========================================================================
    # SHORT-TERM MEMORY UPDATES
    # ========================================================================

    def update_short_term(self, **kwargs):
        """
        Update short-term memory with provided key-value pairs.
        
        Args:
            **kwargs: Any number of key-value pairs to update
        """
        for k, v in kwargs.items():
            if v is not None:
                self.short_term[k] = v

    def get_context(self) -> Dict[str, Any]:
        """Get current short-term memory context."""
        return self.short_term

    # ========================================================================
    # MEMORY MANAGEMENT
    # ========================================================================

    def clear_short_term(self):
        """Clear only short-term memory (for new conversation)."""
        self.short_term = {
            "last_query": None,
            "retrieved_ids": [],
            "summary": None,
            "advisor": None,
            "feature_analysis": None,
            "latency_metrics": None,
            "intent": None,
        }
        print("Short-term memory cleared")

    def clear_memory(self):
        """Clear both short-term and long-term memory."""
        self.long_term = self._get_default_structure()
        self.short_term = {
            "last_query": None,
            "retrieved_ids": [],
            "summary": None,
            "advisor": None,
            "feature_analysis": None,
            "latency_metrics": None,
            "intent": None,
        }
        self.save_long_term()
        print("Memory cleared successfully")

    # ========================================================================
    # ANALYTICS AND REPORTING
    # ========================================================================

    def get_query_count(self) -> int:
        """Get total number of queries processed."""
        return len(self.long_term.get("query_history", []))

    def get_brand_history(self) -> list:
        """Get list of all brands queried."""
        return self.long_term.get("brands", [])

    def get_recent_queries(self, n: int = 10) -> list:
        """Get the n most recent queries."""
        history = self.long_term.get("query_history", [])
        return history[-n:] if len(history) > n else history

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get summary of system performance metrics."""
        metrics = self.long_term.get("performance_metrics", [])
        
        if not metrics:
            return {"message": "No performance metrics available"}
        
        # Calculate averages
        total_latencies = []
        retrieval_counts = []
        suggestion_counts = []
        
        for entry in metrics:
            m = entry.get("metrics", {})
            if "total_latency" in m:
                total_latencies.append(m["total_latency"])
            if "retrieval_count" in m:
                retrieval_counts.append(m["retrieval_count"])
            if "suggestions_generated" in m:
                suggestion_counts.append(m["suggestions_generated"])
        
        summary = {
            "total_queries": len(metrics),
            "avg_latency": sum(total_latencies) / len(total_latencies) if total_latencies else 0,
            "avg_retrievals": sum(retrieval_counts) / len(retrieval_counts) if retrieval_counts else 0,
            "avg_suggestions": sum(suggestion_counts) / len(suggestion_counts) if suggestion_counts else 0,
        }
        
        return summary

    def get_suggestion_feedback_summary(self) -> Dict[str, Any]:
        """Get summary of suggestion acceptance/rejection rates."""
        accepted = len(self.long_term.get("accepted_suggestions", []))
        rejected = len(self.long_term.get("rejected_suggestions", []))
        total = accepted + rejected
        
        return {
            "total_feedback": total,
            "accepted": accepted,
            "rejected": rejected,
            "acceptance_rate": (accepted / total * 100) if total > 0 else 0
        }

    # ========================================================================
    # EXPORT AND BACKUP
    # ========================================================================

    def export_memory(self, output_path: str = None) -> str:
        """
        Export complete memory to a JSON file.
        
        Args:
            output_path: Optional custom path for export
            
        Returns:
            Path to the exported file
        """
        if output_path is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"memory_backup_{timestamp}.json"
        
        export_data = {
            "short_term": self.short_term,
            "long_term": self.long_term,
            "export_timestamp": str(datetime.now())
        }
        
        try:
            with open(output_path, "w") as f:
                json.dump(export_data, f, indent=2)
            print(f"Memory exported to {output_path}")
            return output_path
        except Exception as e:
            print(f"Error exporting memory: {e}")
            return None

    def import_memory(self, import_path: str) -> bool:
        """
        Import memory from a JSON file.
        
        Args:
            import_path: Path to the JSON file to import
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with open(import_path, "r") as f:
                data = json.load(f)
            
            if "long_term" in data:
                self.long_term = data["long_term"]
                self._ensure_keys()
            
            if "short_term" in data:
                self.short_term = data["short_term"]
            
            self.save_long_term()
            print(f"Memory imported from {import_path}")
            return True
        except Exception as e:
            print(f"Error importing memory: {e}")
            return False

    # ========================================================================
    # DEBUG AND INSPECTION
    # ========================================================================

    def print_memory_stats(self):
        """Print detailed memory statistics."""
        print("\n" + "="*70)
        print("MEMORY STATISTICS")
        print("="*70)
        
        print(f"\nShort-term Memory:")
        print(f"  Last Query: {self.short_term.get('last_query', 'None')[:50]}...")
        print(f"  Retrieved IDs: {len(self.short_term.get('retrieved_ids', []))} items")
        print(f"  Has Summary: {self.short_term.get('summary') is not None}")
        print(f"  Has Advisor: {self.short_term.get('advisor') is not None}")
        print(f"  Has Feature Analysis: {self.short_term.get('feature_analysis') is not None}")
        print(f"  Current Intent: {self.short_term.get('intent', 'None')}")
        
        print(f"\nLong-term Memory:")
        print(f"  Total Queries: {len(self.long_term.get('query_history', []))}")
        print(f"  Tracked Brands: {len(self.long_term.get('brands', []))}")
        print(f"  Product Categories: {len(self.long_term.get('product_categories', []))}")
        print(f"  Summary History: {len(self.long_term.get('summary_history', []))}")
        print(f"  Performance Metrics: {len(self.long_term.get('performance_metrics', []))}")
        print(f"  Accepted Suggestions: {len(self.long_term.get('accepted_suggestions', []))}")
        print(f"  Rejected Suggestions: {len(self.long_term.get('rejected_suggestions', []))}")
        
        perf_summary = self.get_performance_summary()
        if "total_queries" in perf_summary:
            print(f"\nPerformance Summary:")
            print(f"  Average Latency: {perf_summary['avg_latency']:.3f}s")
            print(f"  Average Retrievals: {perf_summary['avg_retrievals']:.1f}")
            print(f"  Average Suggestions: {perf_summary['avg_suggestions']:.1f}")
        
        feedback_summary = self.get_suggestion_feedback_summary()
        if feedback_summary["total_feedback"] > 0:
            print(f"\nFeedback Summary:")
            print(f"  Total Feedback: {feedback_summary['total_feedback']}")
            print(f"  Acceptance Rate: {feedback_summary['acceptance_rate']:.1f}%")
        
        print("="*70 + "\n")

    def __str__(self) -> str:
        """String representation of memory manager."""
        return f"EnhancedMemoryManager(queries={self.get_query_count()}, brands={len(self.get_brand_history())})"

    def __repr__(self) -> str:
        """Detailed representation of memory manager."""
        return (f"EnhancedMemoryManager(file_path='{self.file_path}', "
                f"queries={self.get_query_count()}, "
                f"brands={len(self.get_brand_history())}, "
                f"metrics={len(self.long_term.get('performance_metrics', []))})")


# ============================================================================
# CONVENIENCE FUNCTIONS FOR TESTING
# ============================================================================

def test_memory_manager():
    """Test the memory manager functionality."""
    print("Testing EnhancedMemoryManager...")
    
    # Create memory manager
    memory = EnhancedMemoryManager("test_memory.json")
    
    # Test adding data
    memory.add_query("What are the issues with Casio watches?")
    memory.add_brand("Casio")
    memory.update_short_term(
        last_query="What are the issues with Casio watches?",
        intent="negative"
    )
    
    # Test performance metrics
    memory.add_performance_metric({
        "total_latency": 4.5,
        "retrieval_count": 60,
        "suggestions_generated": 10
    })
    
    # Save and print stats
    memory.save_long_term()
    memory.print_memory_stats()
    
    # Test export
    export_path = memory.export_memory()
    print(f"\nExported to: {export_path}")
    
    print("\n✅ Memory manager test completed!")
