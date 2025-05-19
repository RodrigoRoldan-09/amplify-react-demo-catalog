import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { GraphQLFormattedError } from 'graphql';

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
}

// Type for Todo items (fallback model)
interface TodoItem {
  id: string;
  content?: GraphQLNullable<string>;
  createdAt: string;
  updatedAt: string;
}

// Response type from GraphQL operations
interface GraphQLResponse<T> {
  data: T | null;
  errors?: GraphQLFormattedError[];
  extensions?: Record<string, unknown>;
}

// Define a type for errors
type AppError = Error | { message: string };

function App() {
  // Debug state to see what's happening
  const [debugInfo, setDebugInfo] = useState<string>("Initializing...");
  const [isLoading, setIsLoading] = useState(true);
  const [modelExists, setModelExists] = useState(false);
  
  // State for demos with proper typing
  const [demos, setDemos] = useState<DemoItem[]>([]);
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

  // Check which models are available and set up subscriptions
  useEffect(() => {
    setDebugInfo("Checking available models...");
    const availableModels = Object.keys(client.models);
    setDebugInfo(prev => prev + "\nAvailable models: " + availableModels.join(", "));
    
    // See if Demo model exists
    if (availableModels.includes("Demo")) {
      setDebugInfo(prev => prev + "\nDemo model exists!");
      setModelExists(true);
      
      // Set up subscription to Demo model
      try {
        const subscription = client.models.Demo.observeQuery().subscribe({
          next: (data) => {
            setDebugInfo(prev => prev + "\nDemo data received: " + data.items.length + " items");
            // Ensure items match our DemoItem type
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
        
        return () => subscription.unsubscribe();
      } catch (error) {
        const typedError = error as AppError;
        setDebugInfo(prev => prev + "\nError setting up Demo subscription: " + typedError.message);
        setIsLoading(false);
      }
    } 
    // Check if Todo model exists (fallback)
    else if (availableModels.includes("Todo")) {
      setDebugInfo(prev => prev + "\nTodo model exists, but Demo model does not exist yet.");
      setModelExists(false);
      
      // Set up subscription to Todo model as fallback
      try {
        // Using type assertion with specific type
        type TodoModels = typeof client.models & { 
          Todo: { 
            observeQuery: () => { 
              subscribe: (options: { 
                next: (data: { items: TodoItem[] }) => void, 
                error: (err: Error) => void 
              }) => { 
                unsubscribe: () => void 
              } 
            } 
          } 
        };
        const todoModels = client.models as TodoModels;
        
        const subscription = todoModels.Todo.observeQuery().subscribe({
          next: (data) => {
            setDebugInfo(prev => prev + "\nTodo data received: " + data.items.length + " items");
            // We won't convert Todo items to Demo format here
            setDemos([]);
            setIsLoading(false);
          },
          error: (err) => {
            const typedError = err as AppError;
            setDebugInfo(prev => prev + "\nError in Todo subscription: " + typedError.message);
            setIsLoading(false);
          }
        });
        
        return () => subscription.unsubscribe();
      } catch (error) {
        const typedError = error as AppError;
        setDebugInfo(prev => prev + "\nError setting up Todo subscription: " + typedError.message);
        setIsLoading(false);
      }
    }
    else {
      setDebugInfo(prev => prev + "\nNo valid models found!");
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
          // Removed unused parameter
          setDebugInfo(prev => prev + "\nDemo created successfully!");
        }).catch((err) => {
          const typedError = err as AppError;
          setDebugInfo(prev => prev + "\nFailed to create Demo: " + typedError.message);
        });
      } catch (error) {
        const typedError = error as AppError;
        setDebugInfo(prev => prev + "\nError testing database: " + typedError.message);
      }
    } else if (availableModels.includes("Todo")) {
      // Test creating a Todo as fallback
      try {
        // Using type assertion with specific type
        type TodoModels = typeof client.models & { 
          Todo: { 
            create: (item: { content: string }) => Promise<GraphQLResponse<TodoItem>> 
          } 
        };
        const todoModels = client.models as TodoModels;
        
        todoModels.Todo.create({
          content: "Test Todo"
        }).then(() => {
          // Removed unused parameter
          setDebugInfo(prev => prev + "\nTodo created successfully! Demo model not available yet.");
        }).catch((err) => {
          const typedError = err as AppError;
          setDebugInfo(prev => prev + "\nFailed to create Todo: " + typedError.message);
        });
      } catch (error) {
        const typedError = error as AppError;
        setDebugInfo(prev => prev + "\nError testing database: " + typedError.message);
      }
    } else {
      setDebugInfo(prev => prev + "\nNo valid models found to test!");
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
    if (!modelExists) {
      setDebugInfo("Cannot delete: Demo model is not available in the backend yet.");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this demo?")) {
      try {
        client.models.Demo.delete({ id });
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
    
    if (!modelExists) {
      setDebugInfo("Cannot submit: Demo model is not available in the backend yet.");
      return;
    }
    
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

  // UI part remains the same
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
      
      {!modelExists && (
        <div style={{ 
          border: '1px solid #f03e3e', 
          padding: '16px', 
          backgroundColor: '#fff5f5', 
          color: '#e03131',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <strong>Backend Configuration Issue:</strong> The Demo model does not exist in your backend yet. 
          <p>Your backend needs to be updated to include the Demo model. Please check the AWS Amplify Console to see if your deployment is complete.</p>
          <p>If the deployment has completed but the Demo model still isn't available, try:</p>
          <ol style={{ marginLeft: '20px' }}>
            <li>Verify that your amplify/data/resources.ts file has the correct schema</li>
            <li>Commit and push changes to trigger a new deployment</li>
            <li>Check the AWS Amplify Console for any deployment errors</li>
          </ol>
        </div>
      )}
      
      {isLoading ? (
        <div>Loading data...</div>
      ) : (
        <>
          {!isFormOpen ? (
            <button onClick={() => setIsFormOpen(true)} disabled={!modelExists}>
              + Add New Demo
            </button>
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
                  <button type="submit" disabled={!modelExists}>
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
                    disabled={!modelExists}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => demo.id && deleteDemo(demo.id)}
                    style={{ backgroundColor: '#ef4444' }}
                    disabled={!modelExists}
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