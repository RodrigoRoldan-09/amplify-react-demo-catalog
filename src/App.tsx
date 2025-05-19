import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

// Define the Demo type based on your schema
type DemoType = Schema["Demo"]["type"];

// Define a type for errors
type AppError = Error | { message: string };

function App() {
  // Debug state to see what's happening
  const [debugInfo, setDebugInfo] = useState<string>("Initializing...");
  const [isLoading, setIsLoading] = useState(true);
  
  // Properly typed state for demos
  const [demos, setDemos] = useState<DemoType[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    projectName: "",
    githubLink: "",
    projectLink: "",
    imageUrl: ""
  });
  
  const [formErrors, setFormErrors] = useState({
    projectName: false,
    githubLink: false,
    projectLink: false,
    imageUrl: false
  });

  // Debug function to test the database
// Update the testDatabase function with the correct return type
function testDatabase() {
  setDebugInfo("Testing database models...");
  
  // Check what models are available
  setDebugInfo(prev => prev + "\nAvailable models: " + Object.keys(client.models).join(", "));
  
  // Try to create a test item
  try {
    client.models.Demo.create({
      projectName: "Test Project",
      githubLink: "https://github.com/test/project",
      projectLink: "https://test-project.example.com",
      imageUrl: "https://via.placeholder.com/400x200?text=Test+Project"
    }).then((response) => {
      // The response contains a data property with the created item
      setDebugInfo(prev => prev + "\nDemo created successfully: " + JSON.stringify(response.data));
    }).catch((error: AppError) => {
      setDebugInfo(prev => prev + "\nFailed to create Demo: " + error.message);
    });
  } catch (error) {
    const typedError = error as AppError;
    setDebugInfo(prev => prev + "\nError testing database: " + typedError.message);
  }
}

  function validateForm() {
    const errors = {
      projectName: formData.projectName.trim() === "",
      githubLink: formData.githubLink.trim() === "",
      projectLink: formData.projectLink.trim() === "",
      imageUrl: formData.imageUrl.trim() === ""
    };
    
    setFormErrors(errors);
    return !Object.values(errors).some(error => error);
  }
  
  function deleteDemo(id: string) {
    if (window.confirm("Are you sure you want to delete this demo?")) {
      try {
        client.models.Demo.delete({ id });
      } catch (error) {
        const typedError = error as AppError;
        setDebugInfo("Error deleting demo: " + typedError.message);
      }
    }
  }
  
  function openEditForm(demo: DemoType) {
    if (!demo) return;
    
    setFormData({
      projectName: demo.projectName || "",
      githubLink: demo.githubLink || "",
      projectLink: demo.projectLink || "",
      imageUrl: demo.imageUrl || ""
    });
    
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
  
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (editingId) {
        // Update existing demo
        client.models.Demo.update({
          id: editingId,
          ...formData
        });
        setEditingId(null);
      } else {
        // Create new demo
        client.models.Demo.create(formData);
      }
      
      // Reset form
      setFormData({
        projectName: "",
        githubLink: "",
        projectLink: "",
        imageUrl: ""
      });
      setIsFormOpen(false);
    } catch (error) {
      const typedError = error as AppError;
      setDebugInfo("Error in form submit: " + typedError.message);
    }
  }

  useEffect(() => {
    setIsLoading(true);
    setDebugInfo("Setting up subscriptions...");
    
    // Subscription with proper typing
    let subscription: { unsubscribe: () => void } | null = null;
    
    try {
      setDebugInfo(prev => prev + "\nUsing Demo model");
      subscription = client.models.Demo.observeQuery().subscribe({
        next: (data) => {
          setDebugInfo(prev => prev + "\nDemo data received: " + data.items.length + " items");
          setDemos([...data.items]);
          setIsLoading(false);
        },
        error: (error: AppError) => {
          setDebugInfo(prev => prev + "\nError in Demo subscription: " + error.message);
          setIsLoading(false);
        }
      });
    } catch (error) {
      const typedError = error as AppError;
      setDebugInfo(prev => prev + "\nError setting up subscription: " + typedError.message);
      setIsLoading(false);
    }
    
    // Cleanup subscription on component unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <main>
      <h1>My AWS Project Demos</h1>
      
      {/* Debug panel */}
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '10px', 
        margin: '10px 0', 
        backgroundColor: '#f8f8f8',
        borderRadius: '8px',
        whiteSpace: 'pre-wrap'
      }}>
        <h3>Debug Info (Remove in production)</h3>
        <button onClick={testDatabase}>Test Database</button>
        <div style={{ marginTop: '10px' }}>{debugInfo}</div>
      </div>
      
      {isLoading ? (
        <div>Loading data...</div>
      ) : (
        <>
          {!isFormOpen ? (
            <button onClick={() => setIsFormOpen(true)}>+ Add New Demo</button>
          ) : (
            <div style={{ border: '1px solid #ccc', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <h2>{editingId ? 'Edit Demo' : 'Add New Demo'}</h2>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px' }}>
                    Project Name *
                    <input
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleChange}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: formErrors.projectName ? '1px solid red' : '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                    {formErrors.projectName && <span style={{ color: 'red', fontSize: '0.8rem' }}>Project name is required</span>}
                  </label>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px' }}>
                    GitHub Link *
                    <input
                      type="text"
                      name="githubLink"
                      value={formData.githubLink}
                      onChange={handleChange}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: formErrors.githubLink ? '1px solid red' : '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                    {formErrors.githubLink && <span style={{ color: 'red', fontSize: '0.8rem' }}>GitHub link is required</span>}
                  </label>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px' }}>
                    Project Link *
                    <input
                      type="text"
                      name="projectLink"
                      value={formData.projectLink}
                      onChange={handleChange}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: formErrors.projectLink ? '1px solid red' : '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                    {formErrors.projectLink && <span style={{ color: 'red', fontSize: '0.8rem' }}>Project link is required</span>}
                  </label>
                </div>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px' }}>
                    Image URL *
                    <input
                      type="text"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleChange}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        border: formErrors.imageUrl ? '1px solid red' : '1px solid #ccc',
                        borderRadius: '4px'
                      }}
                    />
                    {formErrors.imageUrl && <span style={{ color: 'red', fontSize: '0.8rem' }}>Image URL is required</span>}
                  </label>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit">
                    {editingId ? 'Update Demo' : 'Add Demo'}
                  </button>
                  <button 
                    type="button"
                    style={{ backgroundColor: '#666' }}
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingId(null);
                      setFormData({
                        projectName: "",
                        githubLink: "",
                        projectLink: "",
                        imageUrl: ""
                      });
                      setFormErrors({
                        projectName: false,
                        githubLink: false,
                        projectLink: false,
                        imageUrl: false
                      });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {demos.map((demo) => (
              <div key={demo.id || Math.random().toString()} style={{ 
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                  {demo.projectName || "Unnamed Project"}
                </h3>
                
                <div style={{ marginBottom: '8px' }}>
                  <img 
                    src={demo.imageUrl || "https://via.placeholder.com/400x200?text=No+Image"}
                    alt={demo.projectName || "Project demo"} 
                    style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '4px' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/400x200?text=Image+Not+Found';
                      target.onerror = null; // Prevent infinite loop
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '16px', flexGrow: 1 }}>
                  {demo.githubLink && (
                    <div style={{ marginBottom: '4px' }}>
                      <a 
                        href={demo.githubLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
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
                      >
                        Live Project
                      </a>
                    </div>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 'auto' }}>
                  <button 
                    onClick={() => demo.id && openEditForm(demo)}
                    style={{ backgroundColor: '#f59e0b' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => demo.id && deleteDemo(demo.id)}
                    style={{ backgroundColor: '#ef4444' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {demos.length === 0 && !isFormOpen && (
            <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#f8f8f8', borderRadius: '8px' }}>
              <p>No demos added yet. Create your first demo to showcase your AWS projects!</p>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default App;