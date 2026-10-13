// src/services/api.js
const API_BASE_URL = 'http://localhost:8000/api';

// ==================== PROJECTS API ====================

export const getProjects = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch projects');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('getProjects error:', error);
    throw error;
  }
};

export const getProject = async (projectId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch project');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('getProject error:', error);
    throw error;
  }
};

export const createProject = async (projectData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create project');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('createProject error:', error);
    throw error;
  }
};

export const updateProject = async (projectId, projectData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update project');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('updateProject error:', error);
    throw error;
  }
};

export const deleteProject = async (projectId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete project');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('deleteProject error:', error);
    throw error;
  }
};

// ==================== PAGES API ====================

export const addPage = async (projectId, pageData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/projects/${projectId}/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pageData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to add page');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('addPage error:', error);
    throw error;
  }
};

export const updatePage = async (pageId, pageData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pageData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update page');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('updatePage error:', error);
    throw error;
  }
};

export const deletePage = async (pageId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/pages/${pageId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete page');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('deletePage error:', error);
    throw error;
  }
};

// ==================== AI GENERATION ====================

export const generateCode = async (page, allPages, linkedElements = []) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page: {
          ...page,
          element_types: page.element_types || {},
        },
        all_pages: allPages,
        linked_elements: linkedElements,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate code');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('generateCode error:', error);
    throw error;
  }
};

export const generateMultiPageCode = async (pages, pageLinks = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-multi-page`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pages: pages,
        page_links: pageLinks,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate multi-page code');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('generateMultiPageCode error:', error);
    throw error;
  }
};

// ==================== HEALTH CHECK ====================

export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    if (!response.ok) {
      throw new Error('Backend not healthy');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('healthCheck error:', error);
    return { status: 'offline' };
  }
};