import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './homepage.css';


export default function Home() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const handleOpenCanvas = () => {
    const token = localStorage.getItem('access_token');

    if (token) {
      navigate('/canvas');
    } else {
      navigate('/login');
    }
  };

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

  const steps = [
    {
      num: '01',
      title: 'Draw your interface',
      desc: 'Sketch layout structures, buttons, inputs, and content blocks directly on the digital canvas.'
    },
    {
      num: '02',
      title: 'Analyze the sketch',
      desc: 'The vision system identifies components, bounding shapes, and structural alignment.',
      featured: true
    },
    {
      num: '03',
      title: 'Generate frontend code',
      desc: 'Export semantically structured HTML and CSS ready to integrate into your codebase.'
    }
  ];

  const features = [
    {
      num: '01',
      title: 'Interactive drawing canvas',
      desc: 'A lightweight canvas interface optimized for wireframing with stroke adjustment, shape primitives, and clear controls.'
    },
    {
      num: '02',
      title: 'Shape & layout detection',
      desc: 'Automatic classification of drawn objects into standard UI elements and nested container hierarchies.'
    },
    {
      num: '03',
      title: 'AI-powered code generation',
      desc: 'Generates clean, predictable HTML and CSS output matching the spatial proportions of your sketch.'
    },
    {
      num: '04',
      title: 'Export generated code',
      desc: 'Copy component code directly to your clipboard or download markup files for immediate development use.'
    }
  ];

  return (
    <div className="page">
      <div className="grid-field" aria-hidden="true"></div>

      {/* Navigation */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="brand">
            <span className="brand-mark"></span>
            <span className="brand-name">
              Sketch<span className="brand-accent">2</span>Code
            </span>
          </div>
          
<div className="nav-actions">
  <button className="btn-outline" onClick={() => navigate('/login')}>
    Login
  </button>

  <button className="btn-outline" onClick={() => navigate('/signup')}>
    Sign Up
  </button>

  <button className="btn-solid" onClick={handleOpenCanvas}>
  Open Canvas
</button>
</div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Gemini Vision · Layout Engine</span>
            <h1 className="hero-title">
              Sketch it.
              <br />
              <span className="hero-title-alt">Ship the code.</span>
            </h1>
            <p className="hero-sub">
              Draw a rough interface and let the vision engine turn it into
              semantic HTML and CSS you can actually ship.
            </p>
            <div className="hero-actions">
              <button className="btn-solid" onClick={handleOpenCanvas}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <span className="hero-hint">No design tools required</span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <span className="frame-tick tick-tl"></span>
            <span className="frame-tick tick-tr"></span>
            <span className="frame-tick tick-bl"></span>
            <span className="frame-tick tick-br"></span>

            <div className="sketch-panel">
              <span className="panel-label">sketch.raw</span>
              <div className="doodle doodle-box"></div>
              <div className="doodle doodle-line"></div>
              <div className="doodle doodle-circle"></div>
            </div>

            <div className="convert-arrow">→</div>

            <div className="code-panel">
              <span className="panel-label">output.html</span>
              <pre className="code-lines">
                <span className="c-tag">&lt;button</span>{' '}
                <span className="c-attr">class</span>=
                <span className="c-str">"cta"</span>
                <span className="c-tag">&gt;</span>
                {'\n  Get Started\n'}
                <span className="c-tag">&lt;/button&gt;</span>
              </pre>
            </div>
          </div>
        </div>
      </header>

      {/* How It Works */}
      <section className="section how-section">
        <div className="section-inner">
          <div className="section-head">
            <span className="section-index">§1</span>
            <h2>How it works</h2>
          </div>
          <div className="steps-list">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`step-row ${step.featured ? 'is-featured' : ''}`}
              >
                <span className="step-num">{step.num}</span>
                <div className="step-body">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <div className="section-inner">
          <div className="section-head">
            <span className="section-index">§2</span>
            <h2>What it does</h2>
          </div>
          <div className="features-list">
            {features.map((f, i) => (
              <div className="feature-row" key={i}>
                <span className="feature-num">{f.num}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section faq-section">
        <div className="section-inner">
          <div className="section-head">
            <span className="section-index">§3</span>
            <h2>Questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`faq-row ${openFaq === index ? 'is-open' : ''}`}
              >
                <button
                  className="faq-trigger"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={openFaq === index}
                >
                  <span className="faq-q">{faq.question}</span>
                  <span className="faq-icon" aria-hidden="true"></span>
                </button>
                <div className="faq-panel">
                  <div className="faq-panel-inner">
                    <p>{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="brand">
            <span className="brand-mark small"></span>
            <span className="brand-name">
              Sketch<span className="brand-accent">2</span>Code
            </span>
          </div>
          <span className="footer-note"></span>
        </div>
      </footer>
    </div>
  );
}
