// AdminInterface.tsx - Responsive with Add Tag Feature and Color Support
import { useEffect, useState } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";

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

// Tag type with color
interface TagItem {
  id: string;
  name: string;
  color: string;
}

// DemoTag relationship type
interface DemoTagItem {
  id: string;
  demoId: string;
  tagId: string;
  tag?: TagItem;
}

// GraphQL subscription data types
interface SubscriptionData {
  items: Array<{
    id: string;
    projectName?: GraphQLNullable<string>;
    githubLink?: GraphQLNullable<string>;
    projectLink?: GraphQLNullable<string>;
    imageUrl?: GraphQLNullable<string>;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface TagSubscriptionData {
  items: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface DemoTagSubscriptionData {
  items: Array<{
    id: string;
    demoId: string;
    tagId: string;
  }>;
}

// Define a type for errors
type AppError = Error | { message: string };

// 10 predefined colors that work with orange-black theme
const TAG_COLORS = [
  '#e74c3c', // Red
  '#3498db', // Blue
  '#2ecc71', // Green
  '#9b59b6', // Purple
  '#f39c12', // Orange (different shade)
  '#1abc9c', // Teal
  '#e67e22', // Dark Orange
  '#34495e', // Dark Blue-Gray
  '#27ae60', // Dark Green
  '#8e44ad'  // Dark Purple
];

function AdminInterface() {
  // Debug state to see what's happening
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [modelExists, setModelExists] = useState(false);
  
  // State for demos and tags
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [demoTags, setDemoTags] = useState<DemoTagItem[]>([]);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
  
  // Add tag popup state
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [addTagError, setAddTagError] = useState(false);
  
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

  // Get next available color for new tags
  const getNextAvailableColor = (): string => {
    const usedColors = availableTags.map(tag => tag.color);
    const availableColors = TAG_COLORS.filter(color => !usedColors.includes(color));
    return availableColors.length > 0 ? availableColors[0] : TAG_COLORS[0];
  };

  // Initialize predefined tags with colors
  const initializeTags = async () => {
    const predefinedTags = [
      { name: "Games", color: TAG_COLORS[0] },
      { name: "ML", color: TAG_COLORS[1] },
      { name: "Analytics", color: TAG_COLORS[2] },
      { name: "M&E", color: TAG_COLORS[3] },
      { name: "Generative AI", color: TAG_COLORS[4] }
    ];
    
    try {
      // Check if tags already exist
      const existingTags = await client.models.Tag.list({});
      
      if (existingTags.data && existingTags.data.length === 0) {
        // Create predefined tags if they don't exist
        for (const tag of predefinedTags) {
          await client.models.Tag.create({ name: tag.name, color: tag.color });
        }
        setDebugInfo(prev => prev + "\nPredefined tags created");
      }
      
      // Fetch all tags with null safety
      const allTagsResponse = await client.models.Tag.list({});
      if (allTagsResponse.data) {
        const validTags = allTagsResponse.data
          .filter(tag => tag && tag.id && tag.name) // Filter out null/invalid tags
          .map(tag => ({
            id: tag.id,
            name: tag.name || "",
            color: tag.color || TAG_COLORS[0]
          }));
        setAvailableTags(validTags);
        //setDebugInfo(prev => prev + `\nLoaded ${validTags.length} valid tags`);
      }
    } catch (error) {
      const typedError = error as AppError;
      setDebugInfo(prev => prev + "\nError initializing tags: " + typedError.message);
    }
  };

  // Add new tag function
  const handleAddTag = async () => {
    if (!newTagName.trim()) {
      setAddTagError(true);
      return;
    }

    // Check if tag already exists
    const tagExists = availableTags.some(tag => 
      tag.name.toLowerCase() === newTagName.trim().toLowerCase()
    );

    if (tagExists) {
      setAddTagError(true);
      return;
    }

    try {
      const nextColor = getNextAvailableColor();
      const newTag = await client.models.Tag.create({ 
        name: newTagName.trim(), 
        color: nextColor 
      });
      
      //setDebugInfo(prev => prev + `\nNew tag "${newTagName.trim()}" created with ID: ${newTag.data?.id}`);
      
      // Manually add the new tag to the list immediately for better UX
      if (newTag.data && newTag.data.id) {
        setAvailableTags(prev => [...prev, {
          id: newTag.data!.id,
          name: newTag.data!.name || "",
          color: newTag.data!.color || nextColor
        }]);
      }
      
      setNewTagName("");
      setIsAddTagOpen(false);
      setAddTagError(false);
    } catch (error) {
      const typedError = error as AppError;
      setDebugInfo(prev => prev + "\nError creating tag: " + typedError.message);
      setAddTagError(true);
    }
  };

  // Check which models are available and set up subscriptions
  useEffect(() => {
    //setDebugInfo("Checking available models...");
    const availableModels = Object.keys(client.models);
    //setDebugInfo(prev => prev + "\nAvailable models: " + availableModels.join(", "));
    
    // See if Demo model exists
    if (availableModels.includes("Demo") && availableModels.includes("Tag")) {
      //setDebugInfo(prev => prev + "\nDemo and Tag models exist!");
      setModelExists(true);
      
      // Initialize tags first
      initializeTags();
      
      // Set up subscription to Demo model
      try {
        const demoSubscription = client.models.Demo.observeQuery({}).subscribe({
          next: (data: SubscriptionData) => {
            //setDebugInfo(prev => prev + "\nDemo data received: " + data.items.length + " items");
            // Convert items to match our DemoItem type
            const typedItems: DemoItem[] = data.items.map((item: SubscriptionData['items'][0]) => ({
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
          error: (err: AppError) => {
            const typedError = err as AppError;
            setDebugInfo(prev => prev + "\nError in Demo subscription: " + typedError.message);
            setIsLoading(false);
          }
        });

        // Set up subscription to Tag model
        const tagSubscription = client.models.Tag.observeQuery({}).subscribe({
          next: (data: TagSubscriptionData) => {
           // setDebugInfo(prev => prev + "\nTag data received: " + data.items.length + " tags");
            // Filter out null/invalid tags and add null safety
            const validTags = data.items
              .filter(tag => tag && tag.id && tag.name) // Only include valid tags
              .map(tag => ({
                id: tag.id,
                name: tag.name || "",
                color: tag.color || TAG_COLORS[0]
              }));
            setAvailableTags(validTags);
            //setDebugInfo(prev => prev + `\nProcessed ${validTags.length} valid tags`);
          },
          error: (err: AppError) => {
            const typedError = err as AppError;
            setDebugInfo(prev => prev + "\nError in Tag subscription: " + typedError.message);
          }
        });

        // Set up subscription to DemoTag relationships
        const demoTagSubscription = client.models.DemoTag.observeQuery({}).subscribe({
          next: async (data: DemoTagSubscriptionData) => {
            //setDebugInfo(prev => prev + "\nDemoTag data received: " + data.items.length + " relationships");
            
            // Fetch tag details for each relationship with null safety
            const enrichedDemoTags: DemoTagItem[] = [];
            for (const item of data.items) {
              if (!item || !item.tagId || !item.demoId) {
                setDebugInfo(prev => prev + "\nSkipping invalid DemoTag item");
                continue;
              }
              
              try {
                const tagResponse = await client.models.Tag.get({ id: item.tagId });
                if (tagResponse.data && tagResponse.data.id && tagResponse.data.name) {
                  enrichedDemoTags.push({
                    id: item.id,
                    demoId: item.demoId,
                    tagId: item.tagId,
                    tag: {
                      id: tagResponse.data.id,
                      name: tagResponse.data.name || "",
                      color: tagResponse.data.color || TAG_COLORS[0]
                    }
                  });
                } else {
                  setDebugInfo(prev => prev + `\nTag ${item.tagId} not found or invalid`);
                }
              } catch (error) {
                setDebugInfo(prev => prev + `\nError fetching tag ${item.tagId}: ${error}`);
              }
            }
            setDemoTags(enrichedDemoTags);
            //setDebugInfo(prev => prev + `\nProcessed ${enrichedDemoTags.length} valid demo-tag relationships`);
          },
          error: (err: AppError) => {
            const typedError = err as AppError;
            setDebugInfo(prev => prev + "\nError in DemoTag subscription: " + typedError.message);
          }
        });
        
        return () => {
          demoSubscription.unsubscribe();
          tagSubscription.unsubscribe();
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
  /*
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
  } */

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
        const demoTagsResponse = await client.models.DemoTag.list({
          filter: { demoId: { eq: id } }
        });
        
        if (demoTagsResponse.data) {
          for (const demoTag of demoTagsResponse.data) {
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
  function getTagNames(demo: DemoItem): Array<{ name: string; color: string }> {
    return demoTags
      .filter(dt => dt.demoId === demo.id && dt.tag)
      .map(dt => ({ 
        name: dt.tag!.name, 
        color: dt.tag!.color 
      }));
  }

  // Filter demos based on search term and selected filter tags
  function getFilteredDemos(): DemoItem[] {
    return demos.filter(demo => {
      // Filter by search term (project name)
      const matchesSearch = !searchTerm || 
        (demo.projectName && demo.projectName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter by selected tags
      const matchesTags = selectedFilterTags.length === 0 || 
        selectedFilterTags.every(filterTagId => 
          demoTags.some(dt => dt.demoId === demo.id && dt.tagId === filterTagId)
        );
      
      return matchesSearch && matchesTags;
    });
  }

  // Handle filter tag toggle
  function handleFilterTagToggle(tagId: string) {
    setSelectedFilterTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }

  // Clear all filters
  function clearAllFilters() {
    setSearchTerm("");
    setSelectedFilterTags([]);
  }

  // Handle search input change
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value);
  }

  // Handle new tag input change
  function handleNewTagChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNewTagName(e.target.value);
    if (addTagError) {
      setAddTagError(false);
    }
  }

  // UI part - Responsive design
  return (
    <div style={{ 
      backgroundColor: '#121212', 
      minHeight: '100vh',
      width: '100%',
      padding: '10px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ 
          display: 'flex',
          flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: window.innerWidth <= 768 ? 'stretch' : 'center',
          marginBottom: '20px',
          gap: '10px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <h1 style={{ 
              color: '#f89520', 
              margin: 0,
              fontSize: window.innerWidth <= 768 ? '20px' : '24px'
            }}>
              Demo Catalog - Admin
            </h1>
            
            <button 
              onClick={clearAllFilters}
              style={{
                backgroundColor: '#666',
                color: 'white',
                padding: '8px 12px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🏠 Home
            </button>
            
            <a 
              href="/"
              style={{
                backgroundColor: '#2196f3',
                color: 'white',
                padding: '8px 12px',
                border: 'none',
                borderRadius: '4px',
                textDecoration: 'none',
                fontSize: '12px'
              }}
            >
              👁️ View Public Site
            </a>
          </div>
          
          <button 
            onClick={() => setIsFormOpen(true)} 
            style={{
              backgroundColor: '#f89520',
              color: 'white',
              padding: '10px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: window.innerWidth <= 768 ? '14px' : '16px'
            }}
          >
            + Add Project
          </button>
        </header>
        {/* Debug panel <div style={{ 
          border: '1px solid #333', 
          padding: '10px', 
          margin: '10px 0', 
          backgroundColor: '#222',
          color: '#ddd',
          borderRadius: '8px',
          whiteSpace: 'pre-wrap',
          fontSize: window.innerWidth <= 768 ? '12px' : '14px'
        }}>
          <h3 style={{ fontSize: window.innerWidth <= 768 ? '14px' : '16px' }}>Debug Info (Remove in production)</h3>
          <button onClick={testDatabase} style={{ 
            backgroundColor: '#f89520',
            color: 'white',
            padding: '6px 10px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}>
            Test Database
          </button>
         
        </div> */}
        
         <div style={{ marginTop: '10px', fontSize: '12px' }}>{debugInfo}</div>
        {!modelExists && (
          <div style={{ 
            border: '1px solid #d32f2f', 
            padding: '16px', 
            backgroundColor: '#301b1b', 
            color: '#f44336',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: window.innerWidth <= 768 ? '14px' : '16px'
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
            {/* Filter Section */}
            {!isFormOpen && (
              <div style={{ 
                backgroundColor: '#222', 
                padding: window.innerWidth <= 768 ? '15px' : '20px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid #333'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white', fontSize: window.innerWidth <= 768 ? '14px' : '16px' }}>
                    🔍 Search by Project Name
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      placeholder="Type to search projects..."
                      style={{ 
                        width: '100%', 
                        padding: '10px', 
                        backgroundColor: '#333',
                        color: 'white',
                        border: '1px solid #444',
                        borderRadius: '4px',
                        marginTop: '8px',
                        fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </label>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: 'white', fontSize: window.innerWidth <= 768 ? '14px' : '16px' }}>
                    🏷️ Filter by Tags
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {availableTags.map(tag => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleFilterTagToggle(tag.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: selectedFilterTags.includes(tag.id) ? tag.color : '#444',
                          color: 'white',
                          fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                  
                  {/* Filter Status */}
                  {(searchTerm || selectedFilterTags.length > 0) && (
                    <div style={{ marginTop: '12px', color: '#ddd', fontSize: window.innerWidth <= 768 ? '12px' : '14px' }}>
                      Active filters: 
                      {searchTerm && <span style={{ color: '#f89520' }}> Search: "{searchTerm}"</span>}
                      {selectedFilterTags.length > 0 && (
                        <span style={{ color: '#f89520' }}>
                          {searchTerm ? ', ' : ' '}Tags: {selectedFilterTags.length} selected
                        </span>
                      )}
                      <button 
                        onClick={clearAllFilters}
                        style={{
                          backgroundColor: 'transparent',
                          color: '#f89520',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          marginLeft: '10px',
                          fontSize: window.innerWidth <= 768 ? '12px' : '14px'
                        }}
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Add Tag Popup */}
            {isAddTagOpen && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
              }}>
                <div style={{
                  backgroundColor: '#222',
                  padding: '20px',
                  borderRadius: '8px',
                  border: '2px solid #f89520',
                  maxWidth: '90%',
                  width: '400px'
                }}>
                  <h3 style={{ color: '#f89520', marginTop: 0 }}>Add New Tag</h3>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={handleNewTagChange}
                    placeholder="Enter tag name..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#333',
                      color: 'white',
                      border: addTagError ? '1px solid #f44336' : '1px solid #444',
                      borderRadius: '4px',
                      marginBottom: '10px',
                      boxSizing: 'border-box'
                    }}
                  />
                  {addTagError && (
                    <p style={{ color: '#f44336', fontSize: '14px', margin: '0 0 10px 0' }}>
                      Tag name is required and must be unique
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => {
                        setIsAddTagOpen(false);
                        setNewTagName("");
                        setAddTagError(false);
                      }}
                      style={{
                        backgroundColor: '#666',
                        color: 'white',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTag}
                      style={{
                        backgroundColor: '#f89520',
                        color: 'white',
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Add New Tag
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isFormOpen && (
              <div style={{ 
                backgroundColor: '#222', 
                padding: window.innerWidth <= 768 ? '15px' : '20px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid #333'
              }}>
                <h2 style={{ 
                  color: 'white', 
                  marginTop: 0,
                  fontSize: window.innerWidth <= 768 ? '18px' : '20px'
                }}>
                  {editingId ? 'Edit Demo' : 'Add New Demo'}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'white',
                      fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                    }}>
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
                          borderRadius: '4px',
                          marginTop: '5px',
                          fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                      {formErrors.projectName && <span style={{ color: '#f44336', fontSize: '12px' }}>Project name is required</span>}
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'white',
                      fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                    }}>
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
                          borderRadius: '4px',
                          marginTop: '5px',
                          fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                      {formErrors.githubLink && <span style={{ color: '#f44336', fontSize: '12px' }}>GitHub link is required</span>}
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'white',
                      fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                    }}>
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
                          borderRadius: '4px',
                          marginTop: '5px',
                          fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                      {formErrors.projectLink && <span style={{ color: '#f44336', fontSize: '12px' }}>Project link is required</span>}
                    </label>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'white',
                      fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                    }}>
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
                          borderRadius: '4px',
                          marginTop: '5px',
                          fontSize: window.innerWidth <= 768 ? '14px' : '16px',
                          boxSizing: 'border-box'
                        }}
                      />
                      {formErrors.imageUrl && <span style={{ color: '#f44336', fontSize: '12px' }}>Image URL is required</span>}
                    </label>
                  </div>
                  
                  {/* Tags Section */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      color: 'white',
                      fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                    }}>
                      Tags *
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      {availableTags.length > 0 ? (
                        <>
                          {availableTags.map(tag => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => handleTagToggle(tag.id)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '20px',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: selectedTags.includes(tag.id) ? tag.color : '#444',
                                color: 'white',
                                fontSize: window.innerWidth <= 768 ? '12px' : '14px'
                              }}
                            >
                              {tag.name}
                            </button>
                          ))}
                          {/* Add Tag Button */}
                          <button
                            type="button"
                            onClick={() => setIsAddTagOpen(true)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '50%',
                              border: '2px dashed #f89520',
                              backgroundColor: 'transparent',
                              color: '#f89520',
                              cursor: 'pointer',
                              fontSize: '18px',
                              width: '35px',
                              height: '35px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Add new tag"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <div style={{ color: '#ddd', fontSize: '14px' }}>
                          Loading tags... 
                          <button
                            type="button"
                            onClick={() => setIsAddTagOpen(true)}
                            style={{
                              marginLeft: '10px',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              border: '1px solid #f89520',
                              backgroundColor: 'transparent',
                              color: '#f89520',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Add Tag
                          </button>
                        </div>
                      )}
                    </div>
                    {formErrors.tags && <span style={{ color: '#f44336', fontSize: '12px' }}>At least one tag is required</span>}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row'
                  }}>
                    <button 
                      type="submit" 
                      style={{
                        backgroundColor: '#f89520',
                        color: 'white',
                        padding: '12px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        flex: 1,
                        fontSize: window.innerWidth <= 768 ? '14px' : '16px'
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
                        padding: '12px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        flex: 1,
                        fontSize: window.innerWidth <= 768 ? '14px' : '16px'
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
              gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px'
            }}>
              {getFilteredDemos().map((demo) => (
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
                      fontSize: window.innerWidth <= 768 ? '16px' : '18px', 
                      marginTop: 0,
                      marginBottom: '12px'
                    }}>
                      {demo.projectName || "Unnamed Project"}
                    </h3>
                    
                    {/* Display Tags */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {getTagNames(demo).map(tag => (
                          <span
                            key={tag.name}
                            style={{
                              padding: '3px 6px',
                              backgroundColor: tag.color,
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: window.innerWidth <= 768 ? '10px' : '12px'
                            }}
                          >
                            {tag.name}
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
                            style={{ 
                              color: '#2196f3',
                              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                              wordBreak: 'break-all'
                            }}
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
                            style={{ 
                              color: '#2196f3',
                              fontSize: window.innerWidth <= 768 ? '12px' : '14px',
                              wordBreak: 'break-all'
                            }}
                          >
                            Live Project
                          </a>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px',
                      marginTop: 'auto',
                      flexDirection: window.innerWidth <= 480 ? 'column' : 'row'
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
                          flex: 1,
                          fontSize: window.innerWidth <= 768 ? '12px' : '14px'
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
                          flex: 1,
                          fontSize: window.innerWidth <= 768 ? '12px' : '14px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {getFilteredDemos().length === 0 && !isFormOpen && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                backgroundColor: '#222', 
                color: 'white',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                {demos.length === 0 ? (
                  <>
                    <p style={{ marginBottom: '20px', fontSize: window.innerWidth <= 768 ? '14px' : '16px' }}>No demos added yet. Create your first demo to showcase your AWS projects!</p>
                    <button 
                      onClick={() => setIsFormOpen(true)}
                      style={{ 
                        backgroundColor: '#f89520',
                        color: 'white',
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                      }}
                    >
                      Add Your First Demo
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ marginBottom: '20px', fontSize: window.innerWidth <= 768 ? '14px' : '16px' }}>
                      No projects match your current filters.
                    </p>
                    <p style={{ marginBottom: '20px', color: '#ddd', fontSize: window.innerWidth <= 768 ? '12px' : '14px' }}>
                      {searchTerm && `Search: "${searchTerm}"`}
                      {searchTerm && selectedFilterTags.length > 0 && ' • '}
                      {selectedFilterTags.length > 0 && `${selectedFilterTags.length} tag filter(s) active`}
                    </p>
                    <button 
                      onClick={clearAllFilters}
                      style={{ 
                        backgroundColor: '#f89520',
                        color: 'white',
                        padding: '10px 16px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: window.innerWidth <= 768 ? '14px' : '16px'
                      }}
                    >
                      Clear All Filters
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminInterface;