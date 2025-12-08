import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, AlertCircle, CheckCircle, Clock, BarChart3, Lightbulb, Target, Users, Zap, Watch, ChevronRight, Brain, Database, Sparkles, ArrowRight, Activity, Shield, Award, TrendingDown } from 'lucide-react';
import './App.css';

const SentimentAnalysisApp = () => {
  const [showApp, setShowApp] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis', 'memory', or 'system'
  const [query, setQuery] = useState('');
  const [minStar, setMinStar] = useState('1');
  const [maxStar, setMaxStar] = useState('5');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [memoryData, setMemoryData] = useState(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [memoryError, setMemoryError] = useState('');
  const [systemInfo, setSystemInfo] = useState(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Backend API base URL
  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

  // Background carousel images
  const carouselImages = [
   "https://revolutionwatch.com/wp-content/uploads/2024/12/Revolution-Magazine_Franck-Muller-ascendancy-feature-mobile.jpg",
    "https://hodinkee.imgix.net/uploads/images/c70c3758-f2f1-4cf2-bd9e-0a6deec61b49/TWITS_Under-3k_Article-Hero.jpg?ixlib=rails-1.1.0&fm=jpg&q=55&auto=format&usm=12"
  ];

  // Auto-slide effect for carousel
  useEffect(() => {
    if (!showApp) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % 2);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [showApp]);

  // Fetch system info on mount
  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/system/info`);
      if (response.ok) {
        const data = await response.json();
        setSystemInfo(data.system);
      }
    } catch (err) {
      console.error('Failed to fetch system info:', err);
    }
  };

  const analyzeReviews = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      console.log('🔍 Analyzing query:', query);
      
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          brand: null,
          min_star: minStar ? parseInt(minStar) : null,
          max_star: maxStar ? parseInt(maxStar) : null,
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      console.log('✅ Success! Received data:', data);
      console.log('🎯 Detected Intent:', data.intent);
      console.log('✓ Faithfulness Score:', data.faithfulness?.improved_faithfulness);
      console.log('💡 Recommendations:', data.recommendations?.length || 0, 'items');
      console.log('🎯 Marketing Suggestions:', data.marketing_suggestions?.length || 0, 'items');
      console.log('🏆 Competitive Advantages:', data.competitive_advantages?.length || 0, 'items');
      console.log('⚠️ Risk Areas:', data.risk_areas?.length || 0, 'items');
      console.log('📊 Full data structure:', {
        hasRecommendations: !!data.recommendations,
        hasMarketing: !!data.marketing_suggestions,
        hasAdvantages: !!data.competitive_advantages,
        hasRisks: !!data.risk_areas
      });
      
      setResults(data);
      setLoading(false);

    } catch (err) {
      console.error('❌ Analysis failed:', err);
      setError(`Unable to connect to backend. Please ensure:\n1. Backend server is running (python app.py)\n2. Backend is running on ${API_BASE}\n3. CORS is enabled on the backend\n\nError: ${err.message}`);
      setLoading(false);
    }
  };

  const fetchMemoryData = async () => {
    setLoadingMemory(true);
    setMemoryError('');
    try {
      const response = await fetch(`${API_BASE}/api/memory/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Memory data loaded:', data);
        setMemoryData(data);
      } else {
        console.error('❌ Failed to fetch memory data - Status:', response.status);
        setMemoryError(`Failed to load memory: ${response.status}`);
        setMemoryData({});
      }
    } catch (err) {
      console.error('Failed to fetch memory data:', err);
      setMemoryError(`Error: ${err.message}`);
    } finally {
      setLoadingMemory(false);
    }
  };

  const clearMemory = async (type = 'short_term') => {
    const confirmMessage = type === 'all' 
      ? 'Are you sure you want to clear ALL memory? This cannot be undone.'
      : 'Clear short-term memory (current session only)?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/memory/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        fetchMemoryData(); // Refresh memory data
      }
    } catch (err) {
      console.error('Error clearing memory:', err);
      alert('Failed to clear memory');
    }
  };

  const exportMemory = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/memory/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Memory exported successfully to: ${data.file_path}`);
      }
    } catch (err) {
      console.error('Error exporting memory:', err);
      alert('Failed to export memory');
    }
  };

  // ADD THIS NEW FUNCTION HERE:
const fetchQueryAnalysis = async (query) => {
  try {
    const response = await fetch(`${API_BASE}/api/memory/analysis/${encodeURIComponent(query)}`);
    if (response.ok) {
      const data = await response.json();
      setSelectedAnalysis(data);
      setShowAnalysisModal(true);
    } else {
      alert('Analysis not found for this query');
    }
  } catch (err) {
    console.error('Error fetching analysis:', err);
    alert('Failed to load analysis details');
  }
};

  // Helper function to get intent badge color
  const getIntentColor = (intent) => {
    switch(intent) {
      case 'negative':
        return { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)', text: '#fca5a5' };
      case 'positive':
        return { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)', text: '#6ee7b7' };
      default:
        return { bg: 'rgba(96, 165, 250, 0.2)', border: 'rgba(96, 165, 250, 0.4)', text: '#93c5fd' };
    }
  };

  // Helper function to get sentiment icon
  const getSentimentIcon = (intent) => {
    switch(intent) {
      case 'negative':
        return <TrendingDown size={16} />;
      case 'positive':
        return <TrendingUp size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  // Render landing page
  if (!showApp) {
    return (
      <div className="page-container">
        {/* Animated Background Carousel */}
        <div className="carousel-container">
          {carouselImages.map((img, idx) => (
            <div
              key={idx}
              className={`carousel-slide ${idx === currentSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
          <div className="carousel-overlay" />
        </div>

        {/* Carousel Indicators */}
        <div className="carousel-indicators">
          {carouselImages.map((_, idx) => (
            <button
              key={idx}
              className={`indicator ${idx === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Animated Blurs */}
        <div className="blur-1 animated-blur" />
        <div className="blur-2 animated-blur" />

        {/* Navbar */}
        <nav className="navbar">
          <div className="nav-inner">
            <div className="nav-title">
              <Watch size={28} className="sparkle-icon" style={{ color: '#60a5fa' }} />
              <span className="gradient-text">WatchSense AI</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {systemInfo && (
                <span style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} />
                  v{systemInfo.version}
                </span>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="hero">
          <div className="badge-pill fade-in">
            <Sparkles size={16} className="sparkle-icon" style={{ color: '#fbbf24' }} />
            <span>LangGraph Multi-Agent System • Enhanced AI Analysis</span>
          </div>

          <h1 className="hero-title">
            AI-Powered Watch Review Intelligence
          </h1>

          <p className="hero-sub gradient-text">
            Advanced Multi-Agent System with Intent Detection
          </p>

          <p className="hero-desc">
            Leverage cutting-edge LangGraph architecture to extract actionable insights from customer reviews. 
            Our system automatically detects query intent, verifies claims, and provides detailed recommendations 
            with industry-leading accuracy.
          </p>

          <button
            onClick={() => setShowApp(true)}
            className="btn-primary"
            style={{ margin: '32px auto 0', fontSize: '18px' }}
          >
            Start Analysis
            <ArrowRight size={20} />
          </button>
        </section>

        {/* Watch Cards */}
        <div className="watch-card-wrapper">
          <div className="watch-card fade-in-up hover-scale" style={{ animationDelay: '0.1s' }}>
            <Brain size={48} style={{ color: '#60a5fa', margin: '0 auto 16px' }} className="float-animation" />
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: '700' }}>Intent Detection</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6' }}>
              Automatically detects if queries seek complaints, praises, or balanced feedback
            </p>
          </div>

          <div className="watch-card fade-in-up hover-scale" style={{ animationDelay: '0.2s' }}>
            <Shield size={48} style={{ color: '#c084fc', margin: '0 auto 16px' }} className="float-animation" />
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: '700' }}>Faithfulness Verification</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6' }}>
              Verifies each claim against actual reviews with 80-90% accuracy
            </p>
          </div>

          <div className="watch-card fade-in-up hover-scale" style={{ animationDelay: '0.3s' }}>
            <Target size={48} style={{ color: '#10b981', margin: '0 auto 16px' }} className="float-animation" />
            <h3 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: '700' }}>Smart Recommendations</h3>
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: '1.6' }}>
              Generates actionable improvements and marketing strategies
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="feature-grid">
          <div className="feature-card fade-in-up hover-lift" style={{ animationDelay: '0.4s' }}>
            <Zap size={28} style={{ color: '#fbbf24', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>3 Specialized Agents</h3>
            <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
              retrieval,  summarization,  advisory agents 
              work in harmony through LangGraph workflow orchestration.
            </p>
          </div>

          <div className="feature-card fade-in-up hover-lift" style={{ animationDelay: '0.5s' }}>
            <BarChart3 size={28} style={{ color: '#60a5fa', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>Comprehensive Metrics</h3>
            <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
              Track latency, retrieval precision, rating accuracy, and faithfulness scores. 
              Performance analytics with detailed breakdowns at each pipeline stage.
            </p>
          </div>

          <div className="feature-card fade-in-up hover-lift" style={{ animationDelay: '0.6s' }}>
            <Database size={28} style={{ color: '#c084fc', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '12px' }}>Enhanced Memory System</h3>
            <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
              Short-term and long-term memory with analytics, export/import capabilities, 
              and comprehensive query history tracking.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="footer">
          <p style={{ fontSize: '14px', color: '#9ca3af' }}>
            Powered by LangGraph, FAISS, and Groq LLM • Built with ❤️ by Pancham Desai & Shreya Vyas
          </p>
          {systemInfo && (
            <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              {systemInfo.architecture} • {systemInfo.agents.length} Agents Active
            </p>
          )}
        </footer>
      </div>
    );
  }

  // Main app view
  return (
    <div className="page-container" style={{ paddingBottom: '80px' }}>
      {/* Animated Background */}
      <div className="carousel-container">
        {carouselImages.map((img, idx) => (
          <div
            key={idx}
            className={`carousel-slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        <div className="carousel-overlay" />
      </div>

      <div className="blur-1 animated-blur" />
      <div className="blur-2 animated-blur" />

      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-inner">
          <div className="nav-title">
            <Watch size={24} style={{ color: '#60a5fa' }} />
            <span>WatchSense AI</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={() => setShowApp(false)} className="btn-dark">
              ← Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: 'auto', padding: '40px 24px' }}>
        
        {/* ===== ENHANCED TAB NAVIGATION ===== */}
        <div style={{ 
          background: 'rgba(30, 40, 60, 0.8)',
          border: '2px solid rgba(96, 165, 250, 0.4)',
          borderRadius: '16px',
          padding: '8px',
          marginBottom: '40px',
          display: 'flex',
          gap: '8px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}>
          {/* Analysis Tab */}
          <button
            onClick={() => setActiveTab('analysis')}
            style={{
              flex: 1,
              background: activeTab === 'analysis' 
                ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.3), rgba(59, 130, 246, 0.3))' 
                : 'transparent',
              border: activeTab === 'analysis' 
                ? '2px solid rgba(96, 165, 250, 0.6)' 
                : '2px solid transparent',
              padding: '16px 24px',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: activeTab === 'analysis' 
                ? '0 4px 16px rgba(96, 165, 250, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                : 'none',
              transform: activeTab === 'analysis' ? 'translateY(-2px)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'analysis') {
                e.currentTarget.style.background = 'rgba(96, 165, 250, 0.15)';
                e.currentTarget.style.border = '2px solid rgba(96, 165, 250, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'analysis') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.border = '2px solid transparent';
              }
            }}
          >
            <Search size={20} />
            <span>Analysis</span>
          </button>

          {/* Memory Tab */}
          <button
            onClick={() => {
              setActiveTab('memory');
              fetchMemoryData();
            }}
            style={{
              flex: 1,
              background: activeTab === 'memory' 
                ? 'linear-gradient(135deg, rgba(192, 132, 252, 0.3), rgba(168, 85, 247, 0.3))' 
                : 'transparent',
              border: activeTab === 'memory' 
                ? '2px solid rgba(192, 132, 252, 0.6)' 
                : '2px solid transparent',
              padding: '16px 24px',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '700',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: activeTab === 'memory' 
                ? '0 4px 16px rgba(192, 132, 252, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                : 'none',
              transform: activeTab === 'memory' ? 'translateY(-2px)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'memory') {
                e.currentTarget.style.background = 'rgba(192, 132, 252, 0.15)';
                e.currentTarget.style.border = '2px solid rgba(192, 132, 252, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'memory') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.border = '2px solid transparent';
              }
            }}
          >
            <Database size={20} />
            <span>Memory & Analytics</span>
          </button>
        </div>
        {/* ===== END TAB NAVIGATION ===== */}
            
        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="fade-in">
            {/* Query Input Section */}
            <div style={{
              background: 'rgba(30, 40, 60, 0.6)',
              border: '1px solid rgba(75, 85, 99, 0.3)',
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '32px',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Search size={28} style={{ color: '#60a5fa' }} />
                Review Analysis
              </h2>
              <p style={{ color: '#9ca3af', marginBottom: '24px', lineHeight: '1.6' }}>
                Enter your query to analyze customer sentiment. The system will automatically detect intent and tailor the analysis accordingly.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    Query
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && analyzeReviews()}
                    placeholder="e.g., What do customers complain about? or What do people love?"
                    style={{ width: '100%' }}
                  />
                  <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '6px' }}>
                    💡 Tip: Use words like "complaint", "issue", "love", or "praise" for intent-aware analysis
                  </p>
                </div>

                {/* <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      Min Star Rating
                    </label>
                    <select
                      value={minStar}
                      onChange={(e) => setMinStar(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Any</option>
                      <option value="1">1 Star</option>
                      <option value="2">2 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="5">5 Stars</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      Max Star Rating
                    </label>
                    <select
                      value={maxStar}
                      onChange={(e) => setMaxStar(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">Any</option>
                      <option value="1">1 Star</option>
                      <option value="2">2 Stars</option>
                      <option value="3">3 Stars</option>
                      <option value="4">4 Stars</option>
                      <option value="5">5 Stars</option>
                    </select>
                  </div>
                </div> */}

                <button
                  onClick={analyzeReviews}
                  disabled={loading}
                  className="btn-primary"
                  style={{ alignSelf: 'flex-start', fontSize: '16px' }}
                >
                  {loading ? (
                    <>
                      <div className="spinner" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      Analyze Reviews
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#fca5a5',
                  fontSize: '14px',
                  whiteSpace: 'pre-wrap'
                }}>
                  <AlertCircle size={18} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
                  {error}
                </div>
              )}
            </div>

            {/* Results Section */}
            {results && (
              <div className="fade-in-up">
                {/* Intent Badge */}
                {results.intent && (
                  <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      background: getIntentColor(results.intent).bg,
                      border: `1px solid ${getIntentColor(results.intent).border}`,
                      borderRadius: '12px',
                      color: getIntentColor(results.intent).text,
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {getSentimentIcon(results.intent)}
                      Detected Intent: {results.intent.charAt(0).toUpperCase() + results.intent.slice(1)}
                    </div>
                  </div>
                )}

                {/* Intent-Based Context Explanation */}
                {results.intent && (
                  <div style={{
                    background: results.intent === 'negative' 
                      ? 'rgba(239, 68, 68, 0.1)' 
                      : results.intent === 'positive' 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(96, 165, 250, 0.1)',
                    border: `1px solid ${
                      results.intent === 'negative' 
                        ? 'rgba(239, 68, 68, 0.3)' 
                        : results.intent === 'positive' 
                          ? 'rgba(16, 185, 129, 0.3)' 
                          : 'rgba(96, 165, 250, 0.3)'
                    }`,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ fontSize: '24px' }}>
                      {results.intent === 'negative' ? '⚠️' : results.intent === 'positive' ? '✨' : 'ℹ️'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        marginBottom: '4px',
                        color: results.intent === 'negative' 
                          ? '#fca5a5' 
                          : results.intent === 'positive' 
                            ? '#6ee7b7' 
                            : '#93c5fd'
                      }}>
                        {results.intent === 'negative' 
                          ? 'Negative Intent Analysis' 
                          : results.intent === 'positive' 
                            ? 'Positive Intent Analysis' 
                            : 'Overall Analysis'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#9ca3af', lineHeight: '1.5' }}>
                        {results.intent === 'negative' 
                          ? '🔍 This analysis focuses on customer complaints, issues, and areas needing improvement. Recommendations below are prioritized to address these concerns.'
                          : results.intent === 'positive' 
                            ? '🌟 This analysis highlights what customers love and appreciate. Recommendations focus on amplifying these strengths and leveraging them for marketing.'
                            : '📊 This balanced analysis covers both strengths and weaknesses to give you a complete picture of customer sentiment.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Card */}
                <div style={{
                  background: 'rgba(30, 40, 60, 0.6)',
                  border: '1px solid rgba(75, 85, 99, 0.3)',
                  borderRadius: '20px',
                  padding: '32px',
                  marginBottom: '32px',
                  backdropFilter: 'blur(10px)'
                }}>
                  <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BarChart3 size={28} style={{ color: '#60a5fa' }} />
                    Analysis Summary
                  </h2>
                  <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>
                    {results.summary?.summary_text || results.summary || 'No summary available'}
                  </p>
                </div>

                {/* Top Complaints - Show prominently for negative/overall, minimized for positive */}
                {results.summary?.top_complaints && results.summary.top_complaints.length > 0 && 
                 (results.intent !== 'positive') && (
                  <div style={{
                    background: 'rgba(30, 40, 60, 0.6)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '20px',
                    padding: '32px',
                    marginBottom: '32px',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <AlertCircle size={24} style={{ color: '#f87171' }} />
                      {results.intent === 'negative' ? 'Top Customer Complaints (Focus Area)' : 'Top Customer Complaints'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {results.summary.top_complaints.map((complaint, idx) => {
                        // Handle both string format and object format
                        const isObject = typeof complaint === 'object' && complaint !== null;
                        const issueText = isObject ? complaint.issue : complaint;
                        const frequency = isObject ? complaint.frequency : null;
                        
                        return (
                          <div key={idx} style={{
                            padding: '16px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '10px',
                            transition: 'all 0.3s ease'
                          }} className="hover-lift">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                              <div style={{
                                minWidth: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fca5a5',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                flexShrink: 0
                              }}>
                                {idx + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: frequency ? '6px' : '0', color: '#fecaca', textTransform: 'capitalize' }}>
                                  {issueText}
                                </div>
                                {frequency && (
                                  <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    <strong>Frequency:</strong> {frequency}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Top Praises - Show prominently for positive/overall, minimized for negative */}
                {results.summary?.top_praises && results.summary.top_praises.length > 0 && 
                 (results.intent !== 'negative') && (
                  <div style={{
                    background: 'rgba(30, 40, 60, 0.6)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '20px',
                    padding: '32px',
                    marginBottom: '32px',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <CheckCircle size={24} style={{ color: '#10b981' }} />
                      {results.intent === 'positive' ? 'Top Customer Praises (Focus Area)' : 'Top Customer Praises'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {results.summary.top_praises.map((praise, idx) => {
                        // Handle both string format and object format
                        const isObject = typeof praise === 'object' && praise !== null;
                        const featureText = isObject ? praise.feature : praise;
                        const frequency = isObject ? praise.frequency : null;
                        
                        return (
                          <div key={idx} style={{
                            padding: '16px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '10px',
                            transition: 'all 0.3s ease'
                          }} className="hover-lift">
                            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                              <div style={{
                                minWidth: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: 'rgba(16, 185, 129, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#6ee7b7',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                flexShrink: 0
                              }}>
                                {idx + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: frequency ? '6px' : '0', color: '#6ee7b7', textTransform: 'capitalize' }}>
                                  {featureText}
                                </div>
                                {frequency && (
                                  <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                                    <strong>Frequency:</strong> {frequency}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Feature Analysis - Grid layout with mention counts and ratings */}
                {results.feature_analysis && Object.keys(results.feature_analysis).length > 0 && (
                  <div style={{
                    background: 'rgba(30, 40, 60, 0.6)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '20px',
                    padding: '32px',
                    marginBottom: '32px'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Target size={24} style={{ color: '#60a5fa' }} />
                      Feature-Based Analysis
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      {Object.entries(results.feature_analysis).map(([feature, data]) => (
                        <div key={feature} style={{
                          background: 'rgba(30, 40, 60, 0.5)',
                          border: '1px solid rgba(80, 100, 180, 0.3)',
                          borderRadius: '12px',
                          padding: '16px',
                          transition: 'all 0.3s ease'
                        }} className="hover-lift">
                          <h4 style={{ 
                            fontWeight: '600', 
                            textTransform: 'capitalize', 
                            marginBottom: '12px', 
                            color: '#93c5fd',
                            fontSize: '16px'
                          }}>
                            {feature.replace(/_/g, ' ')}
                          </h4>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                            {/* Mention Count */}
                            {data.mention_count !== undefined && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#9ca3af' }}>Mentions</span>
                                <span style={{ fontWeight: '600', color: 'white' }}>{data.mention_count}</span>
                              </div>
                            )}
                            
                            {/* Average Rating */}
                            {data.avg_rating !== undefined && (
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#9ca3af' }}>Avg Rating</span>
                                <span style={{ fontWeight: '600', color: 'white' }}>{data.avg_rating} ⭐</span>
                              </div>
                            )}
                            
                            {/* Sentiment Breakdown */}
                            {data.sentiment && (
                              <div style={{
                                paddingTop: '8px',
                                borderTop: '1px solid rgba(75, 85, 99, 0.5)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                <span style={{ color: '#34d399' }}>+{data.sentiment.positive || 0}</span>
                                <span style={{ color: '#fbbf24' }}>~{data.sentiment.neutral || 0}</span>
                                <span style={{ color: '#ef4444' }}>-{data.sentiment.negative || 0}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Summary text if available */}
                          {data.summary && (
                            <p style={{ 
                              fontSize: '13px', 
                              color: '#d1d5db', 
                              marginTop: '12px',
                              paddingTop: '12px',
                              borderTop: '1px solid rgba(75, 85, 99, 0.3)',
                              lineHeight: '1.5'
                            }}>
                              {data.summary}
                            </p>
                          )}
                          
                          {/* Sample reviews if available */}
                          {data.samples && data.samples.length > 0 && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(75, 85, 99, 0.3)' }}>
                              <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: '600' }}>
                                Sample Reviews:
                              </div>
                              {data.samples.slice(0, 2).map((sample, sIdx) => (
                                <div key={sIdx} style={{
                                  padding: '8px',
                                  background: 'rgba(15, 20, 40, 0.5)',
                                  border: '1px solid rgba(75, 85, 99, 0.2)',
                                  borderRadius: '6px',
                                  marginBottom: '6px',
                                  fontSize: '12px',
                                  color: '#cbd5e1',
                                  fontStyle: 'italic',
                                  lineHeight: '1.4'
                                }}>
                                  "{sample}"
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px',
                  marginBottom: '32px'
                }}>
                  {/* Reviews Retrieved */}
                  <div className="stats-box hover-lift">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <Database size={24} style={{ color: '#60a5fa' }} />
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#9ca3af' }}>Reviews Retrieved</div>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>
                      {results.metrics?.reviews_retrieved || 0}
                    </div>
                  </div>

                  {/* Avg Rating */}
                  <div className="stats-box hover-lift">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <Award size={24} style={{ color: '#fbbf24' }} />
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#9ca3af' }}>Avg Rating</div>
                    </div>
                    <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>
                      {results.metrics?.avg_rating?.toFixed(1) || 'N/A'} ⭐
                    </div>
                  </div>

                  {/* Faithfulness Score */}
                  {results.faithfulness && (
                    <div className="stats-box hover-lift">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <Shield size={24} style={{ color: '#10b981' }} />
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#9ca3af' }}>Faithfulness</div>
                      </div>
                      <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>
                        {(results.faithfulness.improved_faithfulness * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}

                  {/* Total Latency */}
                  {results.metrics?.total_latency && (
                    <div className="stats-box hover-lift">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <Clock size={24} style={{ color: '#c084fc' }} />
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#9ca3af' }}>Total Time</div>
                      </div>
                      <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>
                        {results.metrics.total_latency.toFixed(2)}s
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {((results.recommendations && results.recommendations.length > 0) ||
                  (results.advisor?.product_improvements && results.advisor.product_improvements.length > 0)) && (
                  <div style={{
                    background: 'rgba(30, 40, 60, 0.6)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '20px',
                    padding: '32px',
                    marginBottom: '32px'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Lightbulb size={24} style={{ color: '#fbbf24' }} />
                      {results.intent === 'negative' 
                        ? 'Recommended Fixes & Improvements' 
                        : results.intent === 'positive' 
                          ? 'Recommendations to Amplify Strengths' 
                          : 'Product Improvement Recommendations'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {(results.recommendations || results.advisor?.product_improvements || []).map((rec, idx) => {
                        const isObject = typeof rec === 'object' && rec !== null;
                        const area = isObject ? rec.area : '';
                        const suggestion = isObject ? rec.suggestion : (typeof rec === 'string' ? rec : rec.suggestion || '');
                        const priority = isObject ? rec.priority : '';
                        const impact = isObject ? rec.impact : '';
                        
                        return (
                          <div key={idx} style={{
                            padding: '20px',
                            background: 'rgba(37, 99, 235, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '12px',
                            transition: 'all 0.3s ease'
                          }} className="hover-lift">
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                              <div style={{
                                minWidth: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'rgba(59, 130, 246, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#60a5fa',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                flexShrink: 0
                              }}>
                                {idx + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                {area && (
                                  <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: '600', 
                                    color: '#60a5fa', 
                                    marginBottom: '6px',
                                    textTransform: 'capitalize'
                                  }}>
                                    {area}
                                  </div>
                                )}
                                <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#e5e7eb', marginBottom: impact || priority ? '8px' : '0' }}>
                                  {suggestion}
                                </p>
                                {(priority || impact) && (
                                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                    {priority && (
                                      <div style={{ fontSize: '13px' }}>
                                        <span style={{ color: '#9ca3af' }}>Priority: </span>
                                        <span style={{ 
                                          color: priority === 'high' ? '#f87171' : priority === 'medium' ? '#fbbf24' : '#10b981',
                                          fontWeight: '600',
                                          textTransform: 'capitalize'
                                        }}>
                                          {priority}
                                        </span>
                                      </div>
                                    )}
                                    {impact && (
                                      <div style={{ fontSize: '13px', color: '#10b981' }}>
                                        <span style={{ color: '#9ca3af' }}>Impact: </span>
                                        <span style={{ fontWeight: '600' }}>{impact}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Marketing Suggestions */}
                {((results.marketing_suggestions && results.marketing_suggestions.length > 0) || 
                  (results.advisor?.marketing_suggestions && results.advisor.marketing_suggestions.length > 0)) && (
                  <div style={{
                    background: 'rgba(30, 40, 60, 0.6)',
                    border: '1px solid rgba(251, 191, 36, 0.3)',
                    borderRadius: '20px',
                    padding: '32px',
                    marginBottom: '32px'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Target size={24} style={{ color: '#fbbf24' }} />
                      Marketing Strategies
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {(results.marketing_suggestions || results.advisor?.marketing_suggestions || []).map((suggestion, idx) => {
                        const isObject = typeof suggestion === 'object' && suggestion !== null;
                        return (
                          <div key={idx} style={{
                            padding: '20px',
                            background: 'rgba(251, 191, 36, 0.1)',
                            border: '1px solid rgba(251, 191, 36, 0.3)',
                            borderRadius: '12px',
                            transition: 'all 0.3s ease'
                          }} className="hover-lift">
                            {isObject ? (
                              <>
                                <div style={{ 
                                  fontSize: '16px', 
                                  fontWeight: '600', 
                                  color: '#fbbf24',
                                  marginBottom: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <Sparkles size={16} />
                                  {suggestion.strategy || 'Strategy'}
                                </div>
                                <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#e5e7eb', marginBottom: '8px' }}>
                                  {suggestion.suggestion}
                                </p>
                                {suggestion.target_audience && (
                                  <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '8px' }}>
                                    🎯 Target: {suggestion.target_audience}
                                  </div>
                                )}
                                {suggestion.expected_outcome && (
                                  <div style={{ fontSize: '13px', color: '#10b981', marginTop: '4px' }}>
                                    📈 Expected: {suggestion.expected_outcome}
                                  </div>
                                )}
                              </>
                            ) : (
                              <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#e5e7eb' }}>
                                {suggestion}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Competitive Advantages */}
                {/* {((results.competitive_advantages && results.competitive_advantages.length > 0) ||
                  (results.advisor?.competitive_advantages && results.advisor.competitive_advantages.length > 0)) && (
                  <div style={{
                    background: 'rgba(30, 40, 60, 0.6)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '20px',
                    padding: '32px',
                    marginBottom: '32px'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Award size={24} style={{ color: '#10b981' }} />
                      Competitive Advantages
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
                      {(results.competitive_advantages || results.advisor?.competitive_advantages || []).map((advantage, idx) => (
                        <div key={idx} style={{
                          padding: '16px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.3s ease'
                        }} className="hover-lift">
                          <CheckCircle size={18} style={{ color: '#10b981', minWidth: '18px' }} />
                          <p style={{ fontSize: '14px', color: '#6ee7b7' }}>
                            {advantage}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}

                {/* Risk Areas - Intent Aware (show for negative and overall only) */}
               {/* {(results.intent === 'negative' || results.intent === 'overall') && 
                 ((results.risk_areas && results.risk_areas.length > 0) ||
                  (results.advisor?.risk_areas && results.advisor.risk_areas.length > 0)) && (
                  <div style={{
                    background: 'rgba(30, 40, 60, 0.6)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '20px',
                    padding: '32px',
                    marginBottom: '32px'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <AlertCircle size={24} style={{ color: '#f87171' }} />
                      {results.intent === 'negative' ? 'Critical Risk Areas (Focus)' : 'Risk Areas to Address'}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(results.risk_areas || results.advisor?.risk_areas || []).map((risk, idx) => (
                        <div key={idx} style={{
                          padding: '16px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.3s ease'
                        }} className="hover-lift">
                          <AlertCircle size={18} style={{ color: '#f87171', minWidth: '18px' }} />
                          <p style={{ fontSize: '14px', color: '#fca5a5' }}>
                            {risk}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )} */}

                {/* Latency Breakdown */}
                {results.metrics?.latency_breakdown && (
                  <div style={{
                    background: 'rgba(30, 40, 60, 0.6)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '20px',
                    padding: '32px',
                    marginBottom: '32px'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Activity size={24} style={{ color: '#c084fc' }} />
                      Performance Breakdown
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                      {Object.entries(results.metrics.latency_breakdown).map(([key, value]) => (
                        <div key={key} style={{
                          padding: '16px',
                          background: 'rgba(124, 58, 237, 0.1)',
                          border: '1px solid rgba(124, 58, 237, 0.3)',
                          borderRadius: '10px'
                        }}>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', textTransform: 'capitalize' }}>
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                            {value.toFixed(3)}s
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* System Performance Metrics - NEW! */}
                {results.performance_metrics && (
                  <div style={{
                    background: 'rgba(30, 40, 60, 0.6)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '20px',
                    padding: '32px',
                    marginBottom: '32px'
                  }}>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Activity size={24} style={{ color: '#c084fc' }} />
                      System Performance Metrics
                    </h3>
                    
                    {/* Main Performance Stats */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '16px',
                      marginBottom: '24px'
                    }}>
                      {/* Total Latency */}
                      <div style={{
                        padding: '16px',
                        background: 'rgba(124, 58, 237, 0.1)',
                        border: '1px solid rgba(124, 58, 237, 0.3)',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <Clock size={24} style={{ color: '#c084fc', marginBottom: '8px' }} />
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                          {results.performance_metrics.total_latency?.toFixed(2)}s
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Total Time</div>
                      </div>

                      {/* Reviews Retrieved */}
                      <div style={{
                        padding: '16px',
                        background: 'rgba(96, 165, 250, 0.1)',
                        border: '1px solid rgba(96, 165, 250, 0.3)',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <Database size={24} style={{ color: '#60a5fa', marginBottom: '8px' }} />
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                          {results.performance_metrics.retrieval_count || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Reviews Retrieved</div>
                      </div>

                      {/* Retrieval Precision */}
                      <div style={{
                        padding: '16px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <Target size={24} style={{ color: '#10b981', marginBottom: '8px' }} />
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                          {((results.performance_metrics.retrieval_precision || 0) * 100).toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Retrieval Precision</div>
                      </div>

                      {/* Rating Accuracy */}
                      <div style={{
                        padding: '16px',
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <CheckCircle size={24} style={{ color: '#fbbf24', marginBottom: '8px' }} />
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                          {((results.performance_metrics.rating_accuracy || 0) * 100).toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Rating Accuracy</div>
                      </div>

                      {/* Faithfulness Score */}
                      <div style={{
                        padding: '16px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <Shield size={24} style={{ color: '#818cf8', marginBottom: '8px' }} />
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                          {((results.performance_metrics.faithfulness_score || 0) * 100).toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Faithfulness Score</div>
                      </div>

                      {/* Suggestions Generated */}
                      <div style={{
                        padding: '16px',
                        background: 'rgba(236, 72, 153, 0.1)',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        borderRadius: '10px',
                        textAlign: 'center'
                      }}>
                        <Lightbulb size={24} style={{ color: '#ec4899', marginBottom: '8px' }} />
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                          {results.performance_metrics.suggestions_generated || 0}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>Suggestions Generated</div>
                      </div>
                    </div>

                    {/* Detailed Time Breakdown */}
                    <div>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#c084fc' }}>
                        Processing Time Breakdown
                      </h4>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                        gap: '12px'
                      }}>
                        {/* Feature Extraction */}
                        {results.performance_metrics.feature_extraction_time !== undefined && (
                          <div style={{
                            padding: '12px',
                            background: 'rgba(15, 20, 40, 0.5)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                              Feature Extraction
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                              {results.performance_metrics.feature_extraction_time.toFixed(3)}s
                            </div>
                          </div>
                        )}

                        {/* Retrieval */}
                        {results.performance_metrics.retrieval_time !== undefined && (
                          <div style={{
                            padding: '12px',
                            background: 'rgba(15, 20, 40, 0.5)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                              Retrieval (FAISS)
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                              {results.performance_metrics.retrieval_time.toFixed(3)}s
                            </div>
                          </div>
                        )}

                        {/* Feature Analysis */}
                        {results.performance_metrics.feature_analysis_time !== undefined && (
                          <div style={{
                            padding: '12px',
                            background: 'rgba(15, 20, 40, 0.5)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                              Feature Analysis
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                              {results.performance_metrics.feature_analysis_time.toFixed(3)}s
                            </div>
                          </div>
                        )}

                        {/* Summarization */}
                        {results.performance_metrics.summary_time !== undefined && (
                          <div style={{
                            padding: '12px',
                            background: 'rgba(15, 20, 40, 0.5)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                              Summarization
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                              {results.performance_metrics.summary_time.toFixed(3)}s
                            </div>
                          </div>
                        )}

                        {/* Faithfulness Check */}
                        {results.performance_metrics.faithfulness_time !== undefined && (
                          <div style={{
                            padding: '12px',
                            background: 'rgba(15, 20, 40, 0.5)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                              Faithfulness Check
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                              {results.performance_metrics.faithfulness_time.toFixed(3)}s
                            </div>
                          </div>
                        )}

                        {/* Advisor */}
                        {results.performance_metrics.advisor_time !== undefined && (
                          <div style={{
                            padding: '12px',
                            background: 'rgba(15, 20, 40, 0.5)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                              Advisor Agent
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                              {results.performance_metrics.advisor_time.toFixed(3)}s
                            </div>
                          </div>
                        )}

                        {/* Evaluation */}
                        {results.performance_metrics.evaluation_time !== undefined && (
                          <div style={{
                            padding: '12px',
                            background: 'rgba(15, 20, 40, 0.5)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            borderRadius: '8px'
                          }}>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                              Evaluation
                            </div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                              {results.performance_metrics.evaluation_time.toFixed(3)}s
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Performance Summary */}
                    <div style={{
                      marginTop: '20px',
                      padding: '16px',
                      background: 'rgba(124, 58, 237, 0.05)',
                      border: '1px solid rgba(124, 58, 237, 0.2)',
                      borderRadius: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Zap size={16} style={{ color: '#c084fc' }} />
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#c084fc' }}>
                          Performance Summary
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: '1.6' }}>
                        Analyzed <strong>{results.performance_metrics.retrieval_count}</strong> reviews in{' '}
                        <strong>{results.performance_metrics.total_latency?.toFixed(2)}s</strong> with{' '}
                        <strong>{((results.performance_metrics.retrieval_precision || 0) * 100).toFixed(0)}%</strong> precision.
                        Generated <strong>{results.performance_metrics.suggestions_generated || 0}</strong> recommendations
                        with <strong>{((results.performance_metrics.faithfulness_score || 0) * 100).toFixed(0)}%</strong> faithfulness score.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Memory Tab */}
        {activeTab === 'memory' && (
          <div className="fade-in">
            {/* Memory Header */}
            <div style={{
              background: 'rgba(30, 40, 60, 0.6)',
              border: '1px solid rgba(75, 85, 99, 0.3)',
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '32px'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Database size={28} style={{ color: '#c084fc' }} />
                Memory & Analytics
              </h2>
              <p style={{ color: '#9ca3af', lineHeight: '1.6', marginBottom: '20px' }}>
                Track query history, performance metrics, and system memory across sessions.
              </p>
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={fetchMemoryData}
                  disabled={loadingMemory}
                  className="btn-primary"
                  style={{ fontSize: '14px' }}
                >
                  {loadingMemory ? (
                    <>
                      <div className="spinner" style={{ width: '16px', height: '16px' }} />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      Refresh Memory Data
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => clearMemory('short_term')}
                  className="btn-dark"
                  style={{ fontSize: '14px' }}
                >
                  <AlertCircle size={16} />
                  Clear Session
                </button>
                
                <button 
                  onClick={() => clearMemory('all')}
                  className="btn-dark"
                  style={{ fontSize: '14px' }}
                >
                  <AlertCircle size={16} />
                  Clear All Memory
                </button>
                
                <button 
                  onClick={exportMemory}
                  className="btn-dark"
                  style={{ fontSize: '14px' }}
                >
                  <ChevronRight size={16} />
                  Export Memory
                </button>
              </div>

              {memoryError && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '14px'
                }}>
                  <AlertCircle size={16} style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
                  {memoryError}
                </div>
              )}
            </div>

            {/* Memory Stats */}
            {memoryData && Object.keys(memoryData).length > 0 ? (
              <>
                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '20px',
                  marginBottom: '32px'
                }}>
                  <div className="stats-box hover-lift">
                    <Clock size={24} style={{ color: '#60a5fa', marginBottom: '8px' }} />
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {memoryData.total_queries || 0}
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>Total Queries</div>
                  </div>

                  <div className="stats-box hover-lift">
                    <Target size={24} style={{ color: '#10b981', marginBottom: '8px' }} />
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {memoryData.brands_tracked || 0}
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>Brands Tracked</div>
                  </div>

                  <div className="stats-box hover-lift">
                    <Database size={24} style={{ color: '#c084fc', marginBottom: '8px' }} />
                    <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {memoryData.summaries_stored || 0}
                    </div>
                    <div style={{ fontSize: '14px', color: '#9ca3af' }}>Summaries Stored</div>
                  </div>

                  {memoryData.performance_summary && (
                    <div className="stats-box hover-lift">
                      <Activity size={24} style={{ color: '#fbbf24', marginBottom: '8px' }} />
                      <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '4px' }}>
                        {memoryData.performance_summary.avg_latency?.toFixed(2) || '0'}s
                      </div>
                      <div style={{ fontSize: '14px', color: '#9ca3af' }}>Avg Latency</div>
                    </div>
                  )}
                </div>

                {/* Query History */}
                {memoryData.query_history && memoryData.query_history.length > 0 && (
                  <div className="stats-box" style={{ padding: '24px', marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={20} style={{ color: '#60a5fa' }} />
                      Recent Queries ({memoryData.query_history.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' }}>
                      {memoryData.query_history.slice(0, 20).map((item, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(30, 40, 60, 0.5)',
                          border: '1px solid rgba(75, 85, 99, 0.3)',
                          borderRadius: '8px',
                          padding: '16px',
                          transition: 'all 0.3s ease'
                        }}
                        className="hover-lift">
                          <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '8px' }}>
                            {item.query}
                          </div>
                          <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                            {item.timestamp}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Performance */}
                {memoryData.recent_performance && memoryData.recent_performance.length > 0 && (
                  <div className="stats-box" style={{ padding: '24px', marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={20} style={{ color: '#fbbf24' }} />
                      Recent Performance
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {memoryData.recent_performance.map((perf, idx) => (
                        <div key={idx} style={{
                          background: 'rgba(30, 40, 60, 0.5)',
                          border: '1px solid rgba(75, 85, 99, 0.3)',
                          borderRadius: '8px',
                          padding: '16px'
                        }}>
                          <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '8px' }}>
                            {perf.query}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#9ca3af' }}>
                            <span>⚡ Latency: {perf.total_latency?.toFixed(2)}s</span>
                            <span>💡 Suggestions: {perf.suggestions_generated}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tracked Brands */}
                {memoryData.brands && memoryData.brands.length > 0 && (
                  <div className="stats-box" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Target size={20} style={{ color: '#10b981' }} />
                      Tracked Brands ({memoryData.brands.length})
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      {memoryData.brands.map((brand, idx) => (
                        <div key={idx} style={{
                          padding: '8px 16px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#6ee7b7'
                        }}>
                          {brand}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="stats-box" style={{ padding: '48px', textAlign: 'center' }}>
                <Database size={64} style={{ color: '#c084fc', margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>No Memory Data</h3>
                <p style={{ color: '#9ca3af', maxWidth: '600px', margin: '0 auto 16px' }}>
                  Memory data will appear here once you run your first analysis.
                </p>
                <button onClick={fetchMemoryData} className="btn-primary">
                  Load Memory Data
                </button>
              </div>
            )}
          </div>
        )}

        {/* System Info Tab */}
        {activeTab === 'system' && systemInfo && (
          <div className="fade-in">
            <div style={{
              background: 'rgba(30, 40, 60, 0.6)',
              border: '1px solid rgba(75, 85, 99, 0.3)',
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '32px'
            }}>
              <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Activity size={28} style={{ color: '#60a5fa' }} />
                System Information
              </h2>
              <p style={{ color: '#9ca3af', lineHeight: '1.6' }}>
                Version {systemInfo.version} • {systemInfo.architecture}
              </p>
            </div>

            {/* System Features */}
            <div className="stats-box" style={{ padding: '28px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Sparkles size={22} style={{ color: '#fbbf24' }} />
                Features
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {systemInfo.features.map((feature, idx) => (
                  <div key={idx} style={{
                    padding: '12px 16px',
                    background: 'rgba(37, 99, 235, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <CheckCircle size={16} style={{ color: '#6ee7b7' }} />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Agents */}
            <div className="stats-box" style={{ padding: '28px' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Brain size={22} style={{ color: '#c084fc' }} />
                Active Agents ({systemInfo.agents.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {systemInfo.agents.map((agent, idx) => (
                  <div key={idx} style={{
                    padding: '14px 18px',
                    background: 'rgba(124, 58, 237, 0.1)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <Zap size={18} style={{ color: '#c084fc' }} />
                    {agent}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SentimentAnalysisApp;