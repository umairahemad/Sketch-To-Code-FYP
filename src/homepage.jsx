import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './homepage.css';

export default function Home() {
  const navigate = useNavigate()
  const [openFaq, setOpenFaq] = useState(null);
  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "What types of UI elements can the canvas recognize?",
      answer: "The layout engine recognizes standard wireframe components including buttons, text inputs, headings, image placeholders, cards, and container layouts."
    },
    {
      question: "What code format is generated?",
      answer: "The tool generates clean HTML5 markup alongside responsive CSS flexbox and grid layouts. You can inspect the code directly or copy it into your project."
    },
    {
      question: "Do I need precise drawing skills?",
      answer: "No. The system uses spatial detection to interpret basic geometric shapes and bounding boxes, so rough sketches and quick layouts work effectively."
    },
    {
      question: "Can I edit the generated code?",
      answer: "Yes. Once generated, the code is fully editable in the built-in editor before exporting to your local workflow."
    }
  ];

  return (
    <div className="sketch-page">
      {/* Navigation */}
      <nav className="nav-bar">
        <div className="nav-container">
          <div className="logo">
            <span className="logo-text">Sketch to Code</span>
          </div>
          <button
            className="btn-nav"
            onClick={() => navigate('/canvas')}
          >
            Open Canvas
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="container hero-content">
          <h1 className="hero-title">Sketch to Code</h1>
          <p className="hero-subtitle">
            Turn UI sketches into frontend code using AI.
          </p>
          <div className="hero-actions">
            <button
              className="btn-primary"
              onClick={() => navigate('/canvas')}
            >
              Let's Draw
            </button>
          </div>
        </div>
      </header>

      {/* How It Works */}
      <section className="how-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-description">
              Convert raw interface drawings into structured component layouts in three steps.
            </p>
          </div>
          <div className="steps-grid">
            <div className="step-card">
              <span className="step-index">1</span>
              <h3>Draw your interface</h3>
              <p>Sketch layout structures, buttons, inputs, and content blocks directly on the digital canvas.</p>
            </div>
            <div className="step-card">
              <span className="step-index">2</span>
              <h3>Analyze the sketch</h3>
              <p>The vision system identifies components, bounding shapes, and structural alignment.</p>
            </div>
            <div className="step-card">
              <span className="step-index">3</span>
              <h3>Generate frontend code</h3>
              <p>Export semantically structured HTML and CSS ready to integrate into your codebase.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Features</h2>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Interactive Drawing Canvas</h3>
              <p>A lightweight canvas interface optimized for wireframing with stroke adjustment, shape primitives, and clear controls.</p>
            </div>
            <div className="feature-card">
              <h3>Shape & Layout Detection</h3>
              <p>Automatic classification of drawn objects into standard UI elements and nested container hierarchies.</p>
            </div>
            <div className="feature-card">
              <h3>AI-Powered Code Generation</h3>
              <p>Generates clean, predictable HTML and CSS output matching the spatial proportions of your sketch.</p>
            </div>
            <div className="feature-card">
              <h3>Export Generated Code</h3>
              <p>Copy component code directly to your clipboard or download markup files for immediate development use.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`faq-item ${openFaq === index ? 'active' : ''}`}
                onClick={() => toggleFaq(index)}
              >
                <div className="faq-question">
                  <span>{faq.question}</span>
                  <span className="faq-toggle">{openFaq === index ? '−' : '+'}</span>
                </div>
                {openFaq === index && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-content">
          <span className="footer-brand">Sketch to Code</span>
          <span className="footer-rights">UI Wireframe & Code Engine</span>
        </div>
      </footer>
    </div>
  );
}