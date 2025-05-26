import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
//import { GraphQLFormattedError } from 'graphql';

const client = generateClient<Schema>();

// Define proper types for GraphQL responses
type GraphQLNullable<T> = T | null;

// Base type for Demo items - match the schema's structure
interface DemoItem {
  id: string;
  projectName?: GraphQLNullable<string>;
  githubLink?: GraphQLNullable<string>;
  projectLink?: GraphQLNullable<string>;
  imageUrl?: GraphQLNullable<string>;
  createdAt: string;
  updatedAt: string;
  // Tags will be loaded separately due to GraphQL structure
}

// Tag type
interface TagItem {
  id: string;
  name: string;
}

// DemoTag relationship type
interface DemoTagItem {
  id: string;
  demoId: string;
  tagId: string;
  tag?: TagItem;
}

// Removed unused GraphQL response interface

// Define a type for errors
type AppError = Error | { message: string };

function App() {
  // Debug state to see what's happening
  const [debugInfo, setDebugInfo] = useState<string>("Initializing...");
  const [isLoading, setIsLoading] = useState(true);
  const [modelExists, setModelExists] = useState(false);
  
  // State for demos and tags
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [demoTags, setDemoTags] = useState<DemoTagItem[]>([]);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    projectName: "",
    githubLink: "",
    projectLink: "",
    imageUrl: ""
  });
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [formErrors, setFormErrors] = useState({
    projectName: false,
    githubLink: false,
    projectLink: false,
    imageUrl: false,
    tags: false
  });

  // Initialize predefined tags
  const initializeTags = async () => {
    const predefinedTags = ["Games", "ML", "Analytics", "M&E", "Generative AI"];
    
    try {
      // Check if tags already exist
      const existingTags = await client.models.Tag.list();
      
      if (existingTags.data && existingTags.data.length === 0) {
        // Create predefined tags if they don't exist
        for (const tagName of predefinedTags) {
          await client.models.Tag.create({ name: tagName });
        }
        setDebugInfo(prev => prev + "\nPredefined tags created");
      }
      
      // Fetch all tags
      const allTagsResponse = await client.models.Tag.list();
      if (allTagsResponse.data) {
        setAvailableTags(allTagsResponse.data.map(tag => ({
          id: tag.id,
          name: tag.name || ""
        })));
      }
    } catch (error) {
      const typedError = error as AppError;
      setDebugInfo(prev => prev + "\nError initializing tags: " + typedError.message);
    }
  };

  // Check which models are available and set up subscriptions
  useEffect(() => {
    setDebugInfo("Checking available models...");
    const availableModels = Object.keys(client.models);
    setDebugInfo(prev => prev + "\nAvailable models: " + availableModels.join(", "));
    
    // See if Demo model exists
    if (availableModels.includes("Demo") && availableModels.includes("Tag")) {
      setDebugInfo(prev => prev + "\nDemo and Tag models exist!");
      setModelExists(true);
      
      // Initialize tags first
      initializeTags();
      
      // Set up subscription to Demo model
      try {
        const demoSubscription = client.models.Demo.observeQuery().subscribe({
          next: (data) => {
            setDebugInfo(prev => prev + "\nDemo data received: " + data.items.length + " items");
            // Convert items to match our DemoItem type
            const typedItems: DemoItem[] = data.items.map(item => ({
              id: item.id,
              projectName: item.projectName,
              githubLink: item.githubLink,
              projectLink: item.projectLink,
              imageUrl: item.imageUrl,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt
            }));
            setDemos(typedItems);
            setIsLoading(false);
          },
          error: (err) => {
            const typedError = err as AppError;
            setDebugInfo(prev => prev + "\nError in Demo subscription: " + typedError.message);
            setIsLoading(false);
          }
        });

        // Set up subscription to DemoTag relationships
        const demoTagSubscription = client.models.DemoTag.observeQuery().subscribe({
          next: async (data) => {
            setDebugInfo(prev => prev + "\nDemoTag data received: " + data.items.length + " relationships");
            
            // Fetch tag details for each relationship
            const enrichedDemoTags: DemoTagItem[] = [];
            for (const item of data.items) {
              try {
                const tagResponse = await client.models.Tag.get({ id: item.tagId });
                if (tagResponse.data) {
                  enrichedDemoTags.push({
                    id: item.id,
                    demoId: item.demoId,
                    tagId: item.tagId,
                    tag: {
                      id: tagResponse.data.id,
                      name: tagResponse.data.name || ""
                    }
                  });
                }
              } catch (error) {
                console.error("Error fetching tag:", error);
              }
            }
            setDemoTags(enrichedDemoTags);
          },
          error: (err) => {
            const typedError = err as AppError;
            setDebugInfo(prev => prev + "\nError in DemoTag subscription: " + typedError.message);
          }
        });
        
        return () => {
          demoSubscription.unsubscribe();
          demoTagSubscription.unsubscribe();
        };
      } catch (error) {
        const typedError = error as AppError;
        setDebugInfo(prev => prev + "\nError setting up Demo subscription: " + typedError.message);
        setIsLoading(false);
      }
    } else {
      setDebugInfo(prev => prev + "\nDemo or Tag models don't exist yet!");
      setModelExists(false);
      setIsLoading(false);
    }
  }, []);

  // Test database function
  function testDatabase() {
    setDebugInfo("Testing database...");
    const availableModels = Object.keys(client.models);
    setDebugInfo(prev => prev + "\nAvailable models: " + availableModels.join(", "));
    
    if (availableModels.includes("Demo")) {
      // Test creating a Demo
      try {
        client.models.Demo.create({
          projectName: "Test Project",
          githubLink: "https://github.com/test/project",
          projectLink: "https://test-project.example.com",
          imageUrl: "https://via.placeholder.com/400x200?text=Test+Project"
        }).then(() => {
          setDebugInfo(prev => prev + "\nDemo created successfully!");
        }).catch((err) => {
          const typedError = err as AppError;
          setDebugInfo(prev => prev + "\nFailed to create Demo: " + typedError.message);
        });
      } catch (error) {
        const typedError = error as AppError;
        setDebugInfo(prev => prev + "\nError testing database: " + typedError.message);
      }
    } else {
      setDebugInfo(prev => prev + "\nNo Demo model found to test!");
    }
  }

  function validateForm() {
    const errors = {
      projectName: formData.projectName.trim() === "",
      githubLink: formData.githubLink.trim() === "",
      projectLink: formData.projectLink.trim() === "",
      imageUrl: formData.imageUrl.trim() === "",
      tags: selectedTags.length === 0
    };
    
    setFormErrors(errors);
    return !Object.values(errors).some(error => error);
  }
  
  async function deleteDemo(id: string) {
    if (!modelExists) {
      setDebugInfo("Cannot delete: Demo model is not available in the backend yet.");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this demo?")) {
      try {
        // First delete associated DemoTag relationships
        const demoTags = await client.models.DemoTag.list({
          filter: { demoId: { eq: id } }
        });
        
        if (demoTags.data) {
          for (const demoTag of demoTags.data) {
            await client.models.DemoTag.delete({ id: demoTag.id });
          }
        }
        
        // Then delete the demo
        await client.models.Demo.delete({ id });
      } catch (error) {
        const typedError = error as AppError;
        setDebugInfo("Error deleting demo: " + typedError.message);
      }
    }
  }
  
  function openEditForm(demo: DemoItem) {
    if (!demo) return;
    
    setFormData({
      projectName: demo.projectName || "",
      githubLink: demo.githubLink || "",
      projectLink: demo.projectLink || "",
      imageUrl: demo.imageUrl || ""
    });
    
    // Set selected tags for editing
    const currentTagIds = demoTags
      .filter(dt => dt.demoId === demo.id)
      .map(dt => dt.tagId);
    setSelectedTags(currentTagIds);
    
    if (demo.id) {
      setEditingId(demo.id);
    }
    
    setIsFormOpen(true);
  }
  
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  }
  
  function handleTagToggle(tagId: string) {
    setSelectedTags(prev => {
      const newTags = prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId];
      
      // Clear tags error when user selects tags
      if (newTags.length > 0 && formErrors.tags) {
        setFormErrors(prevErrors => ({
          ...prevErrors,
          tags: false
        }));
      }
      
      return newTags;
    });
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!modelExists) {
      setDebugInfo("Cannot submit: Demo model is not available in the backend yet.");
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    try {
      let demoId: string;
      
      if (editingId) {
        // Update existing demo
        await client.models.Demo.update({
          id: editingId,
          ...formData
        });
        demoId = editingId;
        
        // Delete existing tag relationships
        const existingDemoTags = await client.models.DemoTag.list({
          filter: { demoId: { eq: editingId } }
        });
        
        if (existingDemoTags.data) {
          for (const demoTag of existingDemoTags.data) {
            await client.models.DemoTag.delete({ id: demoTag.id });
          }
        }
        
        setEditingId(null);
      } else {
        // Create new demo
        const newDemo = await client.models.Demo.create(formData);
        demoId = newDemo.data?.id || "";
      }
      
      // Create new tag relationships
      for (const tagId of selectedTags) {
        await client.models.DemoTag.create({
          demoId: demoId,
          tagId: tagId
        });
      }
      
      // Reset form
      setFormData({
        projectName: "",
        githubLink: "",
        projectLink: "",
        imageUrl: ""
      });
      setSelectedTags([]);
      setIsFormOpen(false);
    } catch (error) {
      const typedError = error as AppError;
      setDebugInfo("Error in form submit: " + typedError.message);
    }
  }

  function resetForm() {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({
      projectName: "",
      githubLink: "",
      projectLink: "",
      imageUrl: ""
    });
    setSelectedTags([]);
    setFormErrors({
      projectName: false,
      githubLink: false,
      projectLink: false,
      imageUrl: false,
      tags: false
    });
  }

  // Get tag names for display
  function getTagNames(demo: DemoItem): string[] {
    return demoTags
      .filter(dt => dt.demoId === demo.id && dt.tag)
      .map(dt => dt.tag!.name);
  }

  // UI part - Updated to match the dark theme
  return (
    <div style={{ 
      backgroundColor: '#121212', 
      minHeight: '100vh',
      width: '100%',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h1 style={{ color: '#f89520', margin: 0 }}>OrangeSlice</h1>
          
          <button 
            onClick={() => setIsFormOpen(true)} 
            style={{
              backgroundColor: '#f89520',
              color: 'white',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Add Project
          </button>
        </header>
        
        {/* Debug panel */}
        <div style={{ 
          border: '1px solid #333', 
          padding: '10px', 
          margin: '10px 0', 
          backgroundColor: '#222',
          color: '#ddd',
          borderRadius: '8px',
          whiteSpace: 'pre-wrap'
        }}>
          <h3>Debug Info (Remove in production)</h3>
          <button onClick={testDatabase} style={{ 
            backgroundColor: '#f89520',
            color: 'white',
            padding: '8px 12px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Test Database
          </button>
          <div style={{ marginTop: '10px' }}>{debugInfo}</div>
        </div>
        
        {!modelExists && (
          <div style={{ 
            border: '1px solid #d32f2f', 
            padding: '16px', 
            backgroundColor: '#301b1b', 
            color: '#f44336',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <strong>Backend Configuration Issue:</strong> The Demo or Tag models do not exist in your backend yet. 
            <p>Your backend needs to be updated to include both Demo and Tag models. Please check the AWS Amplify Console to see if your deployment is complete.</p>
          </div>
        )}
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'white' }}>
            Loading demos...
          </div>
        ) : (
          <>
            {isFormOpen && (
              <div style={{ 
                backgroundColor: '#222', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid #333'
              }}>
                <h2 style={{ color: 'white', marginTop: 0 }}>{editingId ? 'Edit Demo' : 'Add New Demo'}</h2>
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                      Project Name *
                      <input
                        type="text"
                        name="projectName"
                        value={formData.projectName}
                        onChange={handleChange}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          backgroundColor: '#333',
                          color: 'white',
                          border: formErrors.projectName ? '1px solid #f44336' : '1px solid #444',
                          borderRadius: '4px'
                        }}
                      />
                      {formErrors.projectName && <span style={{ color: '#f44336', fontSize: '14px' }}>Project name is required</span>}
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                      GitHub Link *
                      <input
                        type="text"
                        name="githubLink"
                        value={formData.githubLink}
                        onChange={handleChange}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          backgroundColor: '#333',
                          color: 'white',
                          border: formErrors.githubLink ? '1px solid #f44336' : '1px solid #444',
                          borderRadius: '4px'
                        }}
                      />
                      {formErrors.githubLink && <span style={{ color: '#f44336', fontSize: '14px' }}>GitHub link is required</span>}
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                      Project Link *
                      <input
                        type="text"
                        name="projectLink"
                        value={formData.projectLink}
                        onChange={handleChange}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          backgroundColor: '#333',
                          color: 'white',
                          border: formErrors.projectLink ? '1px solid #f44336' : '1px solid #444',
                          borderRadius: '4px'
                        }}
                      />
                      {formErrors.projectLink && <span style={{ color: '#f44336', fontSize: '14px' }}>Project link is required</span>}
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                      Image URL *
                      <input
                        type="text"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleChange}
                        style={{ 
                          width: '100%', 
                          padding: '10px', 
                          backgroundColor: '#333',
                          color: 'white',
                          border: formErrors.imageUrl ? '1px solid #f44336' : '1px solid #444',
                          borderRadius: '4px'
                        }}
                      />
                      {formErrors.imageUrl && <span style={{ color: '#f44336', fontSize: '14px' }}>Image URL is required</span>}
                    </label>
                  </div>
                  
                  {/* Tags Section */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'white' }}>
                      Tags *
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {availableTags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '20px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: selectedTags.includes(tag.id) ? '#f89520' : '#444',
                            color: 'white',
                            fontSize: '14px'
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                    {formErrors.tags && <span style={{ color: '#f44336', fontSize: '14px' }}>At least one tag is required</span>}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      type="submit" 
                      style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      {editingId ? 'Update Demo' : 'Add Demo'}
                    </button>
                    <button 
                      type="button"
                      onClick={resetForm}
                      style={{
                        backgroundColor: '#666',
                        color: 'white',
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        flex: 1
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {demos.map((demo, index) => (
                <div key={demo.id} style={{ 
                  backgroundColor: '#222',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #333',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ position: 'relative', height: '180px' }}>
                    <img 
                      src={demo.imageUrl || "https://via.placeholder.com/400x200?text=No+Image"}
                      alt={demo.projectName || "Project demo"} 
                      style={{ 
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
                        target.onerror = null;
                      }}
                    />
                  </div>
                  
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <h3 style={{ 
                      color: 'white', 
                      fontSize: '18px', 
                      marginTop: 0,
                      marginBottom: '12px'
                    }}>
                      Demo {index + 1} - {demo.projectName || "Unnamed Project"}
                    </h3>
                    
                    {/* Display Tags */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {getTagNames(demo).map(tagName => (
                          <span
                            key={tagName}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#f89520',
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}
                          >
                            {tagName}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px', flexGrow: 1 }}>
                      {demo.githubLink && (
                        <div style={{ marginBottom: '8px' }}>
                          <a 
                            href={demo.githubLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#2196f3' }}
                          >
                            GitHub Repository
                          </a>
                        </div>
                      )}
                      
                      {demo.projectLink && (
                        <div>
                          <a 
                            href={demo.projectLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#2196f3' }}
                          >
                            Live Project
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px',
                      marginTop: 'auto'
                    }}>
                      <button 
                        onClick={() => demo.id && openEditForm(demo)}
                        style={{
                          backgroundColor: '#f89520',
                          color: 'white',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => demo.id && deleteDemo(demo.id)}
                        style={{
                          backgroundColor: '#e53935',
                          color: 'white',
                          padding: '8px 12px',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {demos.length === 0 && !isFormOpen && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                backgroundColor: '#222', 
                color: 'white',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                <p style={{ marginBottom: '20px' }}>No demos added yet. Create your first demo to showcase your AWS projects!</p>
                <button 
                  onClick={() => setIsFormOpen(true)}
                  style={{ 
                    backgroundColor: '#f89520',
                    color: 'white',
                    padding: '10px 16px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Add Your First Demo
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;