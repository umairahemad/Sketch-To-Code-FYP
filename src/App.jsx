import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { 
  getProjects, 
  createProject, 
  updateProject, 
  deleteProject, 
  generateCode,
  updatePage,
  getProject,
  generateMultiPageCode
} from './services/api';

// ==================== Element Types Definition ====================
const ELEMENT_TYPES = {
  'Input Controls': [
    { id: 'text-input', name: 'Text Input', icon: '📝' },
    { id: 'textarea', name: 'Textarea', icon: '📄' },
    { id: 'checkbox', name: 'Checkbox', icon: '☑️' },
    { id: 'radio', name: 'Radio Button', icon: '🔘' },
    { id: 'dropdown', name: 'Dropdown Menu', icon: '📋' },
    { id: 'toggle', name: 'Toggle Switch', icon: '🔀' },
    { id: 'slider', name: 'Slider', icon: '🎚️' },
    { id: 'date-picker', name: 'Date Picker', icon: '📅' },
    { id: 'file-upload', name: 'File Upload', icon: '📤' },
  ],
  'Buttons': [
    { id: 'primary-button', name: 'Primary Button', icon: '🔵' },
    { id: 'secondary-button', name: 'Secondary Button', icon: '⚪' },
    { id: 'icon-button', name: 'Icon Button', icon: '🔍' },
    { id: 'fab', name: 'Floating Action Button', icon: '➕' },
  ],
  'Navigation': [
    { id: 'navbar', name: 'Navigation Bar', icon: '🧭' },
    { id: 'tabs', name: 'Tabs', icon: '📑' },
    { id: 'breadcrumbs', name: 'Breadcrumbs', icon: '📍' },
    { id: 'pagination', name: 'Pagination', icon: '🔢' },
    { id: 'sidebar', name: 'Sidebar/Drawer', icon: '📱' },
  ],
  'Visual Elements': [
    { id: 'card', name: 'Card', icon: '🃏' },
    { id: 'avatar', name: 'Avatar', icon: '👤' },
    { id: 'badge', name: 'Badge/Chip', icon: '🏷️' },
    { id: 'accordion', name: 'Accordion', icon: '📚' },
    { id: 'tooltip', name: 'Tooltip', icon: '💬' },
    { id: 'progress-bar', name: 'Progress Bar', icon: '📊' },
    { id: 'modal', name: 'Modal/Dialog', icon: '🪟' },
    { id: 'toast', name: 'Toast/Snackbar', icon: '🔔' },
  ],
};

// ==================== Initial Data ====================
const initialProjectTree = [
  {
    id: 'home_1',
    name: 'Home',
    status: 'draft',
    children: []
  }
];

// ==================== Helper Functions ====================
const updateNodeStatus = (nodes, pageId, newStatus) => {
  return nodes.map(node => {
    if (node.id === pageId) return { ...node, status: newStatus };
    if (node.children?.length) {
      return { ...node, children: updateNodeStatus(node.children, pageId, newStatus) };
    }
    return node;
  });
};

const flattenTree = (nodes) => {
  let pages = [];
  nodes.forEach(node => {
    pages.push(node);
    if (node.children?.length) {
      pages = pages.concat(flattenTree(node.children));
    }
  });
  return pages;
};

const findPageName = (pageId, nodes) => {
  for (const node of nodes) {
    if (node.id === pageId) return node.name;
    if (node.children?.length) {
      const found = findPageName(pageId, node.children);
      if (found) return found;
    }
  }
  return '';
};

// ==================== Toast Component ====================
const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;
  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.message}
    </div>
  );
};

// ==================== Modal Component ====================
const Modal = ({ isOpen, type, projectName, savedProjects, onClose, onConfirm, onDeleteProject }) => {
  const [inputValue, setInputValue] = useState(projectName || '');

  useEffect(() => {
    if (type === 'saveAs' || type === 'new') setInputValue(projectName || '');
  }, [type, projectName, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (type === 'open') return;
    if (inputValue.trim()) onConfirm(inputValue.trim());
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-icon">
            {type === 'open' ? '📂' : type === 'saveAs' ? '📝' : '📄'}
          </span>
          <h2 className="modal-title">
            {type === 'open' ? 'Open Project' : type === 'saveAs' ? 'Save Project As' : 'Create New Project'}
          </h2>
        </div>

        {type === 'open' ? (
          <div className="project-list">
            {savedProjects.length === 0 ? (
              <p className="empty-text">No saved projects found</p>
            ) : (
              savedProjects.map((project, idx) => (
                <div key={idx} className="project-item" onClick={() => onConfirm(project)}>
                  <div className="project-info">
                    <span className="project-name">📁 {project.name}</span>
                    <span className="project-date">
                      Last modified: {new Date(project.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <button
                    className="delete-project-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProject(project.id);
                    }}
                    title="Delete project"
                  >
                    🗑️
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <input
            type="text"
            className="modal-input"
            placeholder="Project name"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            autoFocus
          />
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {type !== 'open' && (
            <button className="btn btn-primary" onClick={handleConfirm}>
              {type === 'saveAs' ? 'Save' : 'Create'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Link Modal Component ====================
const LinkModal = ({ isOpen, elementText, onClose, onConfirm }) => {
  const [pageName, setPageName] = useState('');

  useEffect(() => {
    if (elementText) {
      setPageName(elementText);
    }
  }, [elementText]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-icon">🔗</span>
          <h2 className="modal-title">Create Linked Page</h2>
        </div>

        <p style={{ color: '#94a3b8', marginBottom: '16px' }}>
          Create a new page linked to "{elementText}"
        </p>

        <input
          type="text"
          className="modal-input"
          placeholder="Page name"
          value={pageName}
          onChange={(e) => setPageName(e.target.value)}
          autoFocus
        />

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={() => onConfirm(pageName)}
            disabled={!pageName.trim()}
          >
            Create & Open Page
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Element Type Dropdown ====================
const ElementTypeDropdown = ({ x, y, onClose, onSelect }) => {
  const [activeCategory, setActiveCategory] = useState(Object.keys(ELEMENT_TYPES)[0]);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={menuRef} className="element-type-dropdown" style={{ top: y, left: x }}>
      <div className="dropdown-header">Assign Element Type</div>
      <div className="dropdown-body">
        <div className="category-list">
          {Object.keys(ELEMENT_TYPES).map(category => (
            <button
              key={category}
              className={`category-btn ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="element-list">
          {ELEMENT_TYPES[activeCategory].map(element => (
            <button
              key={element.id}
              className="element-btn"
              onClick={() => onSelect(element)}
            >
              <span className="element-icon">{element.icon}</span>
              <span className="element-name">{element.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== Context Menu Component ====================
const ContextMenu = ({ x, y, onClose, onCopy, onPaste, onDuplicate, onDelete, onAssignType, onSetFrame, elementType }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={menuRef} className="context-menu" style={{ top: y, left: x }}>
      <button className="context-menu-item" onClick={onCopy}>📋 Copy</button>
      <button className="context-menu-item" onClick={onPaste}>📄 Paste</button>
      <button className="context-menu-item" onClick={onDuplicate}>➕ Duplicate</button>
      <div className="context-menu-divider" />
      <button className="context-menu-item" onClick={onAssignType}>
        🏷️ Assign Element Type {elementType && `(${elementType})`}
      </button>
      <button className="context-menu-item" onClick={onSetFrame}>
        🎯 Set as Website Frame
      </button>
      <div className="context-menu-divider" />
      <button className="context-menu-item danger" onClick={onDelete}>🗑️ Delete</button>
    </div>
  );
};

// ==================== Menu Bar Component ====================
const MenuBar = ({ activeMenu, setActiveMenu, menuItems, projectName, setProjectName, onSave }) => {
  return (
    <div className="menu-bar">
      <div className="menu-bar-logo">
        <span>🎨</span>
        <span className="app-name">VisionCraft</span>
      </div>

      {Object.keys(menuItems).map((menuKey) => (
        <div key={menuKey} className="menu-item-wrapper">
          <button
            className={`menu-trigger ${activeMenu === menuKey ? 'active' : ''}`}
            onClick={() => setActiveMenu(activeMenu === menuKey ? null : menuKey)}
          >
            {menuKey}
          </button>
          {activeMenu === menuKey && (
            <>
              <div className="menu-backdrop" onClick={() => setActiveMenu(null)} />
              <div className="dropdown-menu">
                {menuItems[menuKey].map((item, idx) =>
                  item.divider ? (
                    <div key={idx} className="dropdown-divider" />
                  ) : (
                    <button
                      key={idx}
                      className="dropdown-item"
                      onClick={() => {
                        setActiveMenu(null);
                        item.action?.();
                      }}
                      disabled={item.disabled}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      ))}

      <div className="project-name-display">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="project-name-input"
        />
      </div>

      <div className="menu-bar-actions">
        <button className="icon-button" onClick={onSave} title="Save (Ctrl+S)">💾</button>
      </div>
    </div>
  );
};

// ==================== Demo Preview Component ====================
const DemoPreview = ({ projectTree, generatedCode, onClose }) => {
  const [currentPage, setCurrentPage] = useState(projectTree[0]?.id || 'home_1');
  const allPages = flattenTree(projectTree);
  const currentPageData = generatedCode[currentPage];

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'navigate') {
        setCurrentPage(event.data.pageId);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="demo-preview">
      <div className="demo-header">
        <div className="demo-nav">
          {allPages.map(page => (
            <button
              key={page.id}
              className={`demo-nav-btn ${currentPage === page.id ? 'active' : ''}`}
              onClick={() => setCurrentPage(page.id)}
            >
              {page.name}
            </button>
          ))}
        </div>
        <button className="demo-close-btn" onClick={onClose}>✕ Close Demo</button>
      </div>
      <div className="demo-content">
        {currentPageData ? (
          <iframe
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    html, body {
                      margin: 0;
                      padding: 0;
                      overflow: hidden;
                      height: 100%;
                      width: 100%;
                    }
                    ${currentPageData.css}
                  </style>
                  <script>
                    window.navigateTo = function(pageId) {
                      window.parent.postMessage({ type: 'navigate', pageId }, '*');
                    };
                  </script>
                </head>
                <body>
                  ${currentPageData.html}
                  <script>
                    document.querySelectorAll('[data-linked]').forEach(el => {
                      el.addEventListener('click', function() {
                        const targetPage = this.getAttribute('data-linked');
                        navigateTo(targetPage);
                      });
                      el.style.cursor = 'pointer';
                    });
                  </script>
                </body>
              </html>
            `}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="Demo Preview"
          />
        ) : (
          <div className="demo-placeholder">
            <h3>No code generated for this page</h3>
            <p>Generate code first, then run demo</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== Main App Component ====================
export default function App() {
  // Core state
  const [projectTree, setProjectTree] = useState(initialProjectTree);
  const [activePageId, setActivePageId] = useState('home_1');
  const [activeTab, setActiveTab] = useState('draw');
  const [projectName, setProjectName] = useState('My Custom Project');
  const [activeMenu, setActiveMenu] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  // Editor and generation state
  const [currentEditor, setCurrentEditor] = useState(null);
  const [generatedCode, setGeneratedCode] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [canvasDataMap, setCanvasDataMap] = useState({});
  const [pageLinks, setPageLinks] = useState({});
  const [frameData, setFrameData] = useState({});
  const [elementTypes, setElementTypes] = useState({});

  // UI state
  const [modalState, setModalState] = useState({ isOpen: false, type: null });
  const [contextMenu, setContextMenu] = useState(null);
  const [elementTypeDropdown, setElementTypeDropdown] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [toast, setToast] = useState(null);
  const [theme, setTheme] = useState('light');
  const [demoMode, setDemoMode] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [clickedElementText, setClickedElementText] = useState('');
  const [isFullScreenPreview, setIsFullScreenPreview] = useState(false);

  // Backend state
  const [savedProjects, setSavedProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);

  // Load projects from backend on mount
  useEffect(() => {
    loadProjectsFromBackend();
  }, []);

  const loadProjectsFromBackend = async () => {
    try {
      const result = await getProjects();
      if (result.status === 'success') {
        setSavedProjects(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      showToast('Failed to load projects from server', 'error');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            handleNewProject();
            break;
          case 'o':
            e.preventDefault();
            setModalState({ isOpen: true, type: 'open' });
            break;
          case 's':
            e.preventDefault();
            if (e.shiftKey) setModalState({ isOpen: true, type: 'saveAs' });
            else handleSaveProject();
            break;
          case 'z':
            e.preventDefault();
            currentEditor?.undo();
            break;
          case 'y':
            e.preventDefault();
            currentEditor?.redo();
            break;
          default:
            break;
        }
      }
      if (e.key === 'Escape') {
        setActiveMenu(null);
        setModalState((prev) => ({ ...prev, isOpen: false }));
        setContextMenu(null);
        setElementTypeDropdown(null);
        setDemoMode(false);
        setShowLinkModal(false);
        setIsFullScreenPreview(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentEditor, projectName, projectTree, generatedCode]);

  // Toast function
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Listen for preview clicks
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'elementClick') {
        setClickedElementText(event.data.text || 'New Page');
        setShowLinkModal(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ---- File Operations ----
  const handleNewProject = () => {
    if (window.confirm('Start a new project? Current unsaved changes will be lost.')) {
      setProjectTree(initialProjectTree);
      setActivePageId('home_1');
      setGeneratedCode({});
      setProjectName('Untitled Project');
      setCurrentProjectId(null);
      setCanvasDataMap({});
      setPageLinks({});
      setFrameData({});
      setElementTypes({});
      setModalState({ isOpen: false, type: null });
      showToast('New project created', 'success');
    }
  };

  const handleSaveProject = async () => {
    try {
      if (currentProjectId) {
        await updateProject(currentProjectId, {
          name: projectName,
        });
        
        const allPages = flattenTree(projectTree);
        for (const page of allPages) {
          await updatePage(page.id, {
            canvas_data: JSON.stringify(canvasDataMap[page.id] || []),
            generated_html: generatedCode[page.id]?.html || '',
            generated_css: generatedCode[page.id]?.css || '',
            status: page.status,
          });
        }
        
        showToast('Project updated successfully', 'success');
      } else {
        const allPages = flattenTree(projectTree);
        const result = await createProject({
          name: projectName,
          description: '',
          pages: allPages.map(page => ({
            id: page.id,
            name: page.name,
            parent_id: page.parent_id || null,
            status: page.status,
            canvas_data: JSON.stringify(canvasDataMap[page.id] || []),
            generated_html: generatedCode[page.id]?.html || '',
            generated_css: generatedCode[page.id]?.css || '',
          })),
        });
        
        if (result.status === 'success') {
          setCurrentProjectId(result.data.id);
          showToast('Project saved successfully', 'success');
        }
      }
      
      loadProjectsFromBackend();
    } catch (error) {
      console.error('Save error:', error);
      showToast('Failed to save project: ' + error.message, 'error');
    }
  };

  const handleSaveProjectAs = async (newName) => {
    setProjectName(newName);
    setCurrentProjectId(null);
    
    try {
      const allPages = flattenTree(projectTree);
      const result = await createProject({
        name: newName,
        description: '',
        pages: allPages.map(page => ({
          id: page.id,
          name: page.name,
          parent_id: page.parent_id || null,
          status: page.status,
          canvas_data: JSON.stringify(canvasDataMap[page.id] || []),
          generated_html: generatedCode[page.id]?.html || '',
          generated_css: generatedCode[page.id]?.css || '',
        })),
      });
      
      if (result.status === 'success') {
        setCurrentProjectId(result.data.id);
        setModalState({ isOpen: false, type: null });
        showToast(`Project saved as ${newName}`, 'success');
        loadProjectsFromBackend();
      }
    } catch (error) {
      console.error('Save As error:', error);
      showToast('Failed to save project', 'error');
    }
  };

  const buildTreeFromPages = (pages) => {
    if (!pages || pages.length === 0) return initialProjectTree;
    
    const buildNode = (pageId) => {
      const page = pages.find(p => p.id === pageId);
      if (!page) return null;
      
      const children = pages
        .filter(p => p.parent_id === pageId)
        .map(child => buildNode(child.id))
        .filter(Boolean);
      
      return {
        id: page.id,
        name: page.name,
        status: page.status,
        children: children,
      };
    };
    
    const rootPages = pages.filter(p => !p.parent_id);
    return rootPages.map(root => buildNode(root.id)).filter(Boolean);
  };

  const handleOpenProject = async (projectData) => {
    try {
      if (!projectData?.id) return;
      
      const result = await getProject(projectData.id);
      if (result.status === 'success' && result.data) {
        const project = result.data;
        setProjectName(project.name);
        setCurrentProjectId(project.id);
        
        const tree = buildTreeFromPages(project.pages);
        setProjectTree(tree);
        
        const codeMap = {};
        const dataMap = {};
        project.pages.forEach(page => {
          if (page.generated_html || page.generated_css) {
            codeMap[page.id] = {
              html: page.generated_html,
              css: page.generated_css,
            };
          }
          if (page.canvas_data) {
            try {
              dataMap[page.id] = JSON.parse(page.canvas_data);
            } catch (e) {
              dataMap[page.id] = [];
            }
          }
        });
        setGeneratedCode(codeMap);
        setCanvasDataMap(dataMap);
        
        setActivePageId(project.pages[0]?.id || 'home_1');
        setModalState({ isOpen: false, type: null });
        showToast(`Opened ${project.name}`, 'success');
      }
    } catch (error) {
      console.error('Open error:', error);
      showToast('Failed to open project', 'error');
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Delete this project?')) {
      try {
        await deleteProject(projectId);
        loadProjectsFromBackend();
        showToast('Project deleted', 'error');
      } catch (error) {
        showToast('Failed to delete project', 'error');
      }
    }
  };

  const handleExportProject = () => {
    const projectData = {
      name: projectName,
      tree: projectTree,
      generatedCode,
      canvasDataMap,
      pageLinks,
      frameData,
      elementTypes,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Project exported', 'success');
  };

  // ---- Page Tree Operations ----
  const handleAddPage = () => {
    const pageName = window.prompt('Enter page name:');
    if (!pageName) return;
    const newPage = {
      id: `page_${Date.now()}`,
      name: pageName,
      status: 'draft',
      children: [],
    };
    const addNode = (nodes) => {
      return nodes.map((node) => {
        if (node.id === activePageId) {
          return { ...node, children: [...node.children, newPage] };
        }
        if (node.children?.length) {
          return { ...node, children: addNode(node.children) };
        }
        return node;
      });
    };
    setProjectTree(addNode(projectTree));
    showToast(`Page "${pageName}" added`, 'success');
  };

  const handleRenamePage = (e, id, currentName) => {
    e.stopPropagation();
    const newName = window.prompt('Enter new name:', currentName);
    if (!newName || newName === currentName) return;
    const renameNode = (nodes) => {
      return nodes.map((node) => {
        if (node.id === id) return { ...node, name: newName };
        if (node.children?.length) return { ...node, children: renameNode(node.children) };
        return node;
      });
    };
    setProjectTree(renameNode(projectTree));
    showToast(`Page renamed to ${newName}`, 'success');
  };

  const handleDeletePage = (e, id) => {
    e.stopPropagation();
    if (id === 'home_1') {
      alert('Cannot delete the root Home page.');
      return;
    }
    if (!window.confirm('Delete this page and all its subpages?')) return;
    const deleteNode = (nodes) => {
      return nodes
        .filter((node) => node.id !== id)
        .map((node) => ({
          ...node,
          children: deleteNode(node.children || []),
        }));
    };
    setProjectTree(deleteNode(projectTree));
    if (activePageId === id) setActivePageId('home_1');
    showToast('Page deleted', 'error');
  };

  // ---- Canvas Data Extraction ----
  const extractCanvasData = () => {
    if (!currentEditor) {
      showToast('Canvas editor not ready', 'error');
      return null;
    }
    const shapes = currentEditor.getCurrentPageShapes();
    const data = shapes.map((shape) => ({
      id: shape.id,
      type: shape.type,
      x: Math.round(shape.x),
      y: Math.round(shape.y),
      width: shape.props.w ? Math.round(shape.props.w) : null,
      height: shape.props.h ? Math.round(shape.props.h) : null,
      text: shape.props.text || null,
      color: shape.props.color || null,
      fill: shape.props.fill || null,
      elementType: elementTypes[shape.id] || null,
    }));
    
    setCanvasDataMap(prev => ({
      ...prev,
      [activePageId]: data
    }));
    
    return data;
  };

  // ---- AI Code Generation ----
  const handleGenerateCode = async () => {
    const canvasData = extractCanvasData();
    if (!canvasData || canvasData.length === 0) {
      showToast('Draw something on the canvas first', 'error');
      return;
    }
    setIsGenerating(true);
    try {
      const allPages = flattenTree(projectTree);
      
      const pageElementTypes = {};
      canvasData.forEach(elem => {
        if (elem.elementType) {
          pageElementTypes[elem.id] = elem.elementType;
        }
      });
      
      const currentPage = {
        id: activePageId,
        name: findPageName(activePageId, projectTree),
        canvas_data: canvasData,
        frame: frameData[activePageId] || null,
        element_types: pageElementTypes,
      };
      
      const allPagesData = allPages.map(page => ({
        id: page.id,
        name: page.name,
      }));
      
      const linkedElements = [];
      const currentPageLinks = pageLinks[activePageId] || {};
      Object.entries(currentPageLinks).forEach(([elementId, targetPageId]) => {
        linkedElements.push({
          element_id: elementId,
          target_page_id: targetPageId,
          target_page_name: findPageName(targetPageId, projectTree),
        });
      });
      
      const result = await generateCode(currentPage, allPagesData, linkedElements);
      if (result.status === 'success') {
        setGeneratedCode((prev) => ({
          ...prev,
          [activePageId]: {
            html: result.data.html,
            css: result.data.css,
          },
        }));
        setProjectTree((prev) => updateNodeStatus(prev, activePageId, 'generated'));
        showToast('Code generated successfully', 'success');
      } else {
        showToast(`Error: ${result.message}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(`Generation failed: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAllPages = async () => {
    setIsGeneratingAll(true);
    
    try {
      const allPages = flattenTree(projectTree);
      
      if (currentEditor) {
        extractCanvasData();
      }
      
      const pagesData = allPages.map(page => {
        const pageCanvasData = canvasDataMap[page.id] || [];
        
        const pageElementTypes = {};
        pageCanvasData.forEach(elem => {
          if (elem.elementType) {
            pageElementTypes[elem.id] = elem.elementType;
          }
        });
        
        return {
          id: page.id,
          name: page.name,
          canvas_data: pageCanvasData,
          frame: frameData[page.id] || null,
          element_types: pageElementTypes,
        };
      });
      
      const result = await generateMultiPageCode(pagesData, pageLinks);
      
      if (result.status === 'success') {
        setGeneratedCode(result.data);
        
        const updateAllStatus = (nodes) => {
          return nodes.map(node => ({
            ...node,
            status: 'generated',
            children: node.children?.length ? updateAllStatus(node.children) : [],
          }));
        };
        setProjectTree(updateAllStatus(projectTree));
        
        showToast('All pages generated successfully!', 'success');
      }
    } catch (error) {
      console.error('Multi-page generation error:', error);
      showToast('Failed to generate all pages', 'error');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  // ---- Create Linked Page from Preview ----
  const handleCreateLinkedPage = (pageName) => {
    if (!pageName) return;
    
    const newPageId = `page_${Date.now()}`;
    const newPage = {
      id: newPageId,
      name: pageName,
      status: 'draft',
      children: [],
    };
    
    const addNode = (nodes) => {
      return nodes.map((node) => {
        if (node.id === activePageId) {
          return { ...node, children: [...node.children, newPage] };
        }
        if (node.children?.length) {
          return { ...node, children: addNode(node.children) };
        }
        return node;
      });
    };
    setProjectTree(addNode(projectTree));
    
    setActivePageId(newPageId);
    setActiveTab('draw');
    setShowLinkModal(false);
    setClickedElementText('');
    
    showToast(`Page "${pageName}" created!`, 'success');
  };

  // ---- Element Type Assignment ----
  const handleAssignElementType = () => {
    if (!currentEditor) return;
    const selected = currentEditor.getSelectedShapes();
    if (selected.length === 0) {
      showToast('Select an element first', 'error');
      return;
    }
    setElementTypeDropdown({
      x: contextMenu.x,
      y: contextMenu.y,
    });
    setContextMenu(null);
  };

  const handleSelectElementType = (element) => {
    if (!currentEditor) return;
    const selected = currentEditor.getSelectedShapes();
    if (selected.length > 0) {
      setElementTypes(prev => ({
        ...prev,
        [selected[0].id]: element.id,
      }));
      showToast(`Element assigned as ${element.name}`, 'success');
    }
    setElementTypeDropdown(null);
  };

  // ---- Set Frame ----
  const handleSetFrame = () => {
    if (!currentEditor) return;
    const selected = currentEditor.getSelectedShapes();
    if (selected.length === 0) {
      showToast('Select a rectangle first', 'error');
      return;
    }
    const shape = selected[0];
    setFrameData(prev => ({
      ...prev,
      [activePageId]: {
        x: Math.round(shape.x),
        y: Math.round(shape.y),
        width: Math.round(shape.props.w),
        height: Math.round(shape.props.h),
      },
    }));
    setContextMenu(null);
    showToast('Website frame set successfully!', 'success');
  };

  // ---- Context Menu Actions ----
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCopy = () => {
    if (!currentEditor) return;
    const selected = currentEditor.getSelectedShapes();
    if (selected.length === 0) return;
    setClipboard(selected);
    setContextMenu(null);
    showToast('Element copied', 'success');
  };

  const handlePaste = () => {
    if (!currentEditor || !clipboard) return;
    const newShapes = clipboard.map((shape) => ({
      ...shape,
      id: `shape_${Date.now()}_${Math.random()}`,
      x: shape.x + 20,
      y: shape.y + 20,
    }));
    currentEditor.createShapes(newShapes);
    setContextMenu(null);
    showToast('Element pasted', 'success');
  };

  const handleDuplicate = () => {
    if (!currentEditor) return;
    const selected = currentEditor.getSelectedShapes();
    if (selected.length > 0) {
      currentEditor.duplicateShapes(selected);
      setContextMenu(null);
      showToast('Element duplicated', 'success');
    }
  };

  const handleDeleteSelected = () => {
    if (!currentEditor) return;
    const selected = currentEditor.getSelectedShapes();
    if (selected.length > 0) {
      currentEditor.deleteShapes(selected);
      setContextMenu(null);
      showToast('Element deleted', 'error');
    }
  };

  // ---- Theme ----
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // ---- Menu items definition ----
  const menuItems = {
    file: [
      { label: 'New Project', shortcut: 'Ctrl+N', action: handleNewProject },
      { label: 'Open Project', shortcut: 'Ctrl+O', action: () => setModalState({ isOpen: true, type: 'open' }) },
      { divider: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: handleSaveProject },
      { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => setModalState({ isOpen: true, type: 'saveAs' }) },
      { divider: true },
      { label: 'Export Project', action: handleExportProject },
    ],
    edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: () => currentEditor?.undo() },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: () => currentEditor?.redo() },
      { divider: true },
      { label: 'Copy', shortcut: 'Ctrl+C', action: handleCopy },
      { label: 'Paste', shortcut: 'Ctrl+V', action: handlePaste },
      { label: 'Duplicate', action: handleDuplicate },
      { divider: true },
      { label: 'Delete Selected', action: handleDeleteSelected },
    ],
    view: [
      { label: 'Toggle Dark/Light', action: toggleTheme },
      { divider: true },
      { label: 'Zoom In', action: () => currentEditor?.zoomIn() },
      { label: 'Zoom Out', action: () => currentEditor?.zoomOut() },
      { label: 'Reset Zoom', action: () => currentEditor?.resetZoom() },
    ],
    run: [
      { label: 'Run Demo', action: () => setDemoMode(true) },
      { divider: true },
      { label: 'Generate All Pages', action: handleGenerateAllPages },
    ],
  };

  // ---- Render tree ----
  const renderTree = (nodes, depth = 0) => {
    return nodes.map((node) => (
      <div key={node.id} style={{ marginLeft: `${depth * 16}px`, marginTop: '4px' }}>
        <div
          className={`tree-node ${activePageId === node.id ? 'active' : ''}`}
          onClick={() => setActivePageId(node.id)}
          onMouseEnter={() => setHoveredNodeId(node.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
        >
          <div className="tree-node-left">
            <span className={`status-dot ${node.status === 'generated' ? 'green' : 'red'}`} />
            <span>📄 {node.name}</span>
          </div>
          {hoveredNodeId === node.id && (
            <div className="tree-node-actions">
              <button className="tree-action-btn" onClick={(e) => handleRenamePage(e, node.id, node.name)} title="Rename">✏️</button>
              <button className="tree-action-btn" onClick={(e) => handleDeletePage(e, node.id)} title="Delete">🗑️</button>
            </div>
          )}
        </div>
        {node.children?.length > 0 && (
          <div className="tree-children">{renderTree(node.children, depth + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className={`app-container ${theme}`}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }

        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: background 0.3s, color 0.3s;
        }

        .app-container.light {
          --bg-primary: #f6f3ec;
          --bg-secondary: #fffdf8;
          --bg-sidebar: #efe9db;
          --bg-menu: #1e2129;
          --text-primary: #1e2129;
          --text-secondary: #585d6b;
          --border: rgba(30, 33, 41, 0.16);
          --hover: #e5dece;
          --accent: #d9662b;
        }
        .app-container.dark {
          --bg-primary: #17191f;
          --bg-secondary: #1e2129;
          --bg-sidebar: #232630;
          --bg-menu: #111319;
          --text-primary: #f6f3ec;
          --text-secondary: #b6b8c2;
          --border: rgba(246, 243, 236, 0.16);
          --hover: #30333e;
          --accent: #e87942;
        }

        .menu-bar {
          height: 32px;
          background: var(--bg-menu);
          color: #e2e8f0;
          display: flex;
          align-items: center;
          padding: 0 8px;
          font-size: 13px;
          position: relative;
          user-select: none;
          z-index: 1000;
        }
        .menu-bar-logo { display: flex; align-items: center; margin-right: 16px; }
        .app-name { font-weight: 700; }
        .menu-item-wrapper { position: relative; }
        .menu-trigger {
          background: transparent;
          border: none;
          color: #e2e8f0;
          padding: 4px 12px;
          cursor: pointer;
          border-radius: 4px;
          text-transform: capitalize;
        }
        .menu-trigger:hover, .menu-trigger.active { background: #334155; }
        .menu-backdrop { position: fixed; inset: 0; z-index: 999; }
        .dropdown-menu {
          position: absolute;
          top: 28px;
          left: 0;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 6px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          min-width: 250px;
          z-index: 1000;
          padding: 4px;
          animation: fadeIn 0.1s ease;
        }
        .dropdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 8px 12px;
          background: none;
          border: none;
          color: #e2e8f0;
          cursor: pointer;
          border-radius: 4px;
          font-size: 13px;
          text-align: left;
        }
        .dropdown-item:hover { background: #334155; }
        .shortcut { font-size: 11px; color: #64748b; }
        .dropdown-divider { height: 1px; background: #334155; margin: 4px 0; }
        .project-name-display { position: absolute; left: 50%; transform: translateX(-50%); }
        .project-name-input {
          background: transparent;
          border: none;
          text-align: center;
          font-weight: 500;
          color: #94a3b8;
          outline: none;
          font-size: 13px;
        }
        .menu-bar-actions { margin-left: auto; display: flex; align-items: center; }
        .icon-button { background: none; border: none; color: #e2e8f0; cursor: pointer; font-size: 14px; }

        .main-content { display: flex; flex: 1; overflow: hidden; }
        .left-panel {
          width: 260px;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 10;
        }
        .explorer-header {
          padding: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .explorer-title {
          font-size: 11px;
          font-weight: bold;
          color: var(--text-secondary);
          text-transform: uppercase;
        }
        .add-page-btn { background: none; border: none; cursor: pointer; font-size: 16px; }
        .tree-container { padding: 0 8px; overflow-y: auto; flex: 1; }
        .tree-node {
          padding: 6px 12px;
          cursor: pointer;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          color: var(--text-primary);
          transition: background 0.2s;
          height: 28px;
        }
        .tree-node:hover { background: var(--hover); }
        .tree-node.active { background: rgba(217, 102, 43, 0.12); color: var(--text-primary); border-left: 3px solid var(--accent); }
        .tree-node-left { display: flex; align-items: center; }
        .status-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
        }
        .status-dot.green { background: #22c55e; }
        .status-dot.red { background: #ef4444; }
        .tree-node-actions { display: flex; gap: 8px; }
        .tree-action-btn { background: none; border: none; cursor: pointer; font-size: 12px; padding: 0; }
        .tree-children {
          border-left: 1px solid var(--border);
          margin-left: 12px;
          padding-left: 4px;
        }

        .right-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary);
          position: relative;
        }
        .toolbar {
          min-height: 56px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          background: var(--bg-secondary);
          z-index: 10;
          gap: 12px;
        }
        .tabs { display: flex; gap: 8px; }
        .tab-btn {
          padding: 6px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          text-transform: capitalize;
          background: transparent;
          color: var(--text-secondary);
        }
        .tab-btn.active {
          background: rgba(217, 102, 43, 0.12);
          color: var(--accent);
          border-bottom: 2px solid var(--accent);
          border-radius: 0;
        }
        .action-buttons { display: flex; gap: 8px; }
        .btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-generate {
          background: #1e2129 !important;
          color: #f6f3ec !important;
          border: 2px solid #d9662b !important;
          border-radius: 3px !important;
          padding: 9px 16px !important;
          font-family: 'JetBrains Mono', monospace !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 12px rgba(30, 33, 41, 0.15);
          transition: all 0.2s ease;
        }
        .btn-generate:hover:not(:disabled) {
          background: #d9662b !important;
          color: #ffffff !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(217, 102, 43, 0.25);
        }
        .btn-generate-all {
          background: #2454c7 !important;
          color: #ffffff !important;
          border: 1px solid #2454c7 !important;
          border-radius: 3px !important;
        }
        .btn-generate-all:hover:not(:disabled) {
          background: #193f9d !important;
        }
        .btn-demo {
          background: transparent !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border) !important;
          border-radius: 3px !important;
        }
        .btn-demo:hover { background: var(--hover) !important; }
        .btn-home {
          background: transparent !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border) !important;
          border-radius: 3px !important;
        }
        .btn-home:hover {
          background: var(--hover) !important;
          border-color: var(--accent) !important;
        }
        .btn-logout {
          background: #b93832 !important;
          color: #ffffff !important;
          border: 1px solid #b93832 !important;
          border-radius: 3px !important;
        }
        .btn-logout:hover {
          background: #922b27 !important;
          border-color: #922b27 !important;
        }
        .action-buttons { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        @media (max-width: 1100px) {
          .toolbar { align-items: flex-start; flex-wrap: wrap; padding: 10px 12px; }
          .action-buttons { justify-content: flex-start; }
        }

        .workspace {
          flex: 1;
          position: relative;
          background: var(--bg-primary);
        }

        .code-container {
          display: flex;
          gap: 16px;
          height: 100%;
          padding: 16px;
          box-sizing: border-box;
        }
        .code-panel {
          flex: 1;
          background: #1e293b;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          font-family: monospace;
          display: flex;
          flex-direction: column;
          overflow: auto;
        }
        .code-title { margin-bottom: 12px; font-weight: bold; color: #94a3b8; }
        .code-panel pre { margin: 0; white-space: pre-wrap; }

        .preview-container { display: flex; height: 100%; width: 100%; position: relative; }
        .preview-live {
          width: 50%;
          padding: 16px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .preview-live.fullscreen {
          width: 100%;
          position: fixed;
          inset: 0;
          z-index: 5000;
          background: #ffffff;
        }
        .preview-label { 
          margin-bottom: 8px; 
          font-weight: bold; 
          color: var(--text-secondary); 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
        }
        .preview-iframe-wrapper {
          flex: 1;
          background: #ffffff;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          min-height: 0;
        }
        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
          overflow: hidden;
        }
        .preview-placeholder {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: var(--text-secondary);
          font-size: 16px;
        }
        .fullscreen-btn {
          padding: 4px 8px;
          background: #334155;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }
        .preview-editors {
          width: 50%;
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--border);
          background: var(--bg-sidebar);
        }
        .preview-editor {
          flex: 1;
          padding: 16px;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          border-bottom: 1px solid var(--border);
        }
        .preview-editor:last-child { border-bottom: none; }
        .mini-code {
          flex: 1;
          background: #1e293b;
          color: #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          font-family: monospace;
          overflow: auto;
          margin: 0;
          white-space: pre-wrap;
        }

        .element-type-dropdown {
          position: fixed;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          z-index: 3000;
          width: 400px;
          animation: fadeIn 0.15s ease;
        }
        .dropdown-header {
          padding: 12px 16px;
          font-weight: 600;
          color: #e2e8f0;
          border-bottom: 1px solid #334155;
        }
        .dropdown-body { display: flex; max-height: 400px; }
        .category-list {
          width: 150px;
          border-right: 1px solid #334155;
          overflow-y: auto;
        }
        .category-btn {
          display: block;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
        }
        .category-btn:hover { background: #334155; color: #e2e8f0; }
        .category-btn.active { background: #334155; color: #3b82f6; font-weight: 600; }
        .element-list { flex: 1; overflow-y: auto; }
        .element-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          color: #e2e8f0;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
        }
        .element-btn:hover { background: #334155; }
        .element-icon { font-size: 16px; }

        .demo-preview {
          position: fixed;
          inset: 0;
          background: #ffffff;
          z-index: 9999;
          display: flex;
          flex-direction: column;
        }
        .demo-header {
          background: #1e293b;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .demo-nav { display: flex; gap: 8px; flex-wrap: wrap; }
        .demo-nav-btn {
          padding: 8px 16px;
          background: #334155;
          color: #e2e8f0;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .demo-nav-btn.active { background: #3b82f6; color: white; }
        .demo-close-btn {
          padding: 8px 16px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 600;
        }
        .demo-content { flex: 1; overflow: auto; }
        .demo-placeholder {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #94a3b8;
        }

        .context-menu {
          position: fixed;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 6px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          min-width: 200px;
          padding: 4px;
          z-index: 2000;
          animation: fadeIn 0.15s ease;
        }
        .context-menu-item {
          display: block;
          width: 100%;
          padding: 8px 12px;
          background: none;
          border: none;
          color: #e2e8f0;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
          border-radius: 4px;
        }
        .context-menu-item:hover { background: #334155; }
        .context-menu-item.danger { color: #ef4444; }
        .context-menu-divider { height: 1px; background: #334155; margin: 4px 0; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease;
        }
        .modal-content {
          background: #1e293b;
          border-radius: 12px;
          padding: 24px;
          width: 400px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          animation: slideIn 0.3s ease;
        }
        .modal-header { display: flex; align-items: center; margin-bottom: 16px; }
        .modal-icon { font-size: 24px; margin-right: 8px; }
        .modal-title { color: #e2e8f0; font-size: 18px; font-weight: 600; }
        .modal-input {
          width: 100%;
          padding: 10px 12px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 6px;
          color: #e2e8f0;
          font-size: 14px;
          outline: none;
          margin-bottom: 16px;
        }
        .project-list { max-height: 300px; overflow-y: auto; margin-bottom: 16px; }
        .project-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .project-item:hover { background: #334155; }
        .project-info { display: flex; flex-direction: column; }
        .project-name { color: #e2e8f0; font-weight: 500; }
        .project-date { color: #64748b; font-size: 12px; }
        .delete-project-btn { background: none; border: none; cursor: pointer; font-size: 16px; }
        .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
        .btn-secondary { background: #334155; color: #e2e8f0; }
        .btn-primary { background: #3b82f6; color: white; }

        .toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 10000;
          animation: slideInRight 0.3s ease;
        }
        .toast-success { background: #10b981; }
        .toast-error { background: #ef4444; }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {demoMode ? (
        <DemoPreview
          projectTree={projectTree}
          generatedCode={generatedCode}
          onClose={() => setDemoMode(false)}
        />
      ) : (
        <>
          <MenuBar
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            menuItems={menuItems}
            projectName={projectName}
            setProjectName={setProjectName}
            onSave={handleSaveProject}
          />

          <div className="main-content">
            <div className="left-panel">
              <div className="explorer-header">
                <span className="explorer-title">Explorer</span>
                <button className="add-page-btn" onClick={handleAddPage} title="Add Page">📄+</button>
              </div>
              <div className="tree-container">{renderTree(projectTree)}</div>
            </div>

            <div className="right-panel">
              <div className="toolbar">
                <div className="tabs">
                  {['draw', 'frontend', 'preview'].map((tab) => (
                    <button
                      key={tab}
                      className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab === 'draw' ? '✏️ Draw' : tab === 'frontend' ? '💻 Frontend Code' : '👁️ Preview Layout'}
                    </button>
                  ))}
                </div>
                <div className="action-buttons">
                  <button
                    type="button"
                    className="btn btn-home"
                    onClick={() => { window.location.href = '/'; }}
                    title="Return to the home page"
                  >
                    🏠 Home
                  </button>
                  <button
                    type="button"
                    className="btn btn-logout"
                    onClick={() => {
                      localStorage.removeItem('access_token');
                      localStorage.removeItem('user');
                      window.location.href = '/login';
                    }}
                    title="Log out of your account"
                  >
                    ↪ Logout
                  </button>
                  <button
                    className="btn btn-generate"
                    onClick={handleGenerateCode}
                    disabled={isGenerating}
                  >
                    {isGenerating ? '⏳ Generating...' : '✨ Generate Code'}
                  </button>
                  <button
                    className="btn btn-generate-all"
                    onClick={handleGenerateAllPages}
                    disabled={isGeneratingAll}
                  >
                    {isGeneratingAll ? '⏳ Generating All...' : '🚀 Generate All Pages'}
                  </button>
                  <button className="btn btn-demo" onClick={() => setDemoMode(true)}>
                    ▶️ Run Demo
                  </button>
                </div>
              </div>

              <div className="workspace" onContextMenu={handleContextMenu}>
                {activeTab === 'draw' && (
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <Tldraw
                      persistenceKey={activePageId}
                      onMount={(editor) => setCurrentEditor(editor)}
                    />
                  </div>
                )}

                {activeTab === 'frontend' && (
                  <div className="code-container">
                    <div className="code-panel">
                      <div className="code-title">// HTML Code</div>
                      <pre>{generatedCode[activePageId]?.html || '// Click Generate Code first'}</pre>
                    </div>
                    <div className="code-panel">
                      <div className="code-title">/* CSS Code */</div>
                      <pre>{generatedCode[activePageId]?.css || '/* Click Generate Code first */'}</pre>
                    </div>
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="preview-container">
                    <div className={`preview-live ${isFullScreenPreview ? 'fullscreen' : ''}`}>
                      <div className="preview-label">
                        Live Preview (50%)
                        <button 
                          className="fullscreen-btn"
                          onClick={() => setIsFullScreenPreview(!isFullScreenPreview)}
                        >
                          {isFullScreenPreview ? '✕ Exit Full Screen' : '⛶ Full Screen'}
                        </button>
                      </div>
                      <div className="preview-iframe-wrapper">
                        {generatedCode[activePageId] ? (
                          <iframe
                            srcDoc={`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <style>
                                    html, body {
                                      margin: 0;
                                      padding: 0;
                                      overflow: hidden;
                                      height: 100%;
                                      width: 100%;
                                    }
                                    ${generatedCode[activePageId].css}
                                  </style>
                                </head>
                                <body>
                                  ${generatedCode[activePageId].html}
                                  <script>
                                    document.querySelectorAll('[data-linked]').forEach(el => {
                                      el.addEventListener('click', function() {
                                        const targetPage = this.getAttribute('data-linked');
                                        window.parent.postMessage({ type: 'navigate', pageId: targetPage }, '*');
                                      });
                                    });
                                    document.querySelectorAll('*').forEach(el => {
                                      el.addEventListener('click', function(e) {
                                        e.stopPropagation();
                                        const text = this.textContent.trim() || this.innerText.trim();
                                        if (text && text.length > 0 && text.length < 100) {
                                          window.parent.postMessage({ type: 'elementClick', text: text }, '*');
                                        }
                                      });
                                      if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.closest('button') || el.closest('a')) {
                                        el.style.cursor = 'pointer';
                                      }
                                    });
                                  </script>
                                </body>
                              </html>
                            `}
                            className="preview-iframe"
                            title="Preview"
                          />
                        ) : (
                          <div className="preview-placeholder">Draw elements → Generate Code → Preview</div>
                        )}
                      </div>
                    </div>
                    {!isFullScreenPreview && (
                      <div className="preview-editors">
                        <div className="preview-editor">
                          <div className="preview-label">HTML (25%)</div>
                          <pre className="mini-code">{generatedCode[activePageId]?.html || '<!-- HTML -->'}</pre>
                        </div>
                        <div className="preview-editor">
                          <div className="preview-label">CSS (25%)</div>
                          <pre className="mini-code">{generatedCode[activePageId]?.css || '/* CSS */'}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onDuplicate={handleDuplicate}
          onDelete={handleDeleteSelected}
          onAssignType={handleAssignElementType}
          onSetFrame={handleSetFrame}
        />
      )}

      {elementTypeDropdown && (
        <ElementTypeDropdown
          x={elementTypeDropdown.x}
          y={elementTypeDropdown.y}
          onClose={() => setElementTypeDropdown(null)}
          onSelect={handleSelectElementType}
        />
      )}

      <LinkModal
        isOpen={showLinkModal}
        elementText={clickedElementText}
        onClose={() => {
          setShowLinkModal(false);
          setClickedElementText('');
        }}
        onConfirm={handleCreateLinkedPage}
      />

      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        projectName={projectName}
        savedProjects={savedProjects}
        onClose={() => setModalState({ isOpen: false, type: null })}
        onConfirm={(data) => {
          if (modalState.type === 'open') handleOpenProject(data);
          else if (modalState.type === 'saveAs') handleSaveProjectAs(data);
          else if (modalState.type === 'new') {
            setProjectName(data);
            setProjectTree(initialProjectTree);
            setActivePageId('home_1');
            setGeneratedCode({});
            setCurrentProjectId(null);
            setCanvasDataMap({});
            setPageLinks({});
            setFrameData({});
            setElementTypes({});
            setModalState({ isOpen: false, type: null });
            showToast('New project created', 'success');
          }
        }}
        onDeleteProject={handleDeleteProject}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}