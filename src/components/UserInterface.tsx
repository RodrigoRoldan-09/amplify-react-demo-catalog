// UserInterface.tsx - Responsive with Color Support - FIXED
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

function UserInterface() {
  const [isLoading, setIsLoading] = useState(true);
  
  // State for demos and tags
  const [demos, setDemos] = useState<DemoItem[]>([]);
  const [demoTags, setDemoTags] = useState<DemoTagItem[]>([]);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);

  // Load tags
  const loadTags = async () => {
    try {
      // Fetch all tags
      const allTagsResponse = await client.models.Tag.list({});
      if (allTagsResponse.data) {
        const tagData = allTagsResponse.data.map(tag => ({
          id: tag.id,
          name: tag.name || "",
          color: tag.color || "#f89520"
        }));
        setAvailableTags(tagData);
        console.log("Tags loaded in user interface:", tagData);
      }
    } catch (error) {
      const typedError = error as AppError;
      console.error("Error loading tags:", typedError.message);
    }
  };

  // Check which models are available and set up subscriptions
  useEffect(() => {
    console.log("UserInterface: Starting initialization...");
    const availableModels = Object.keys(client.models);
    console.log("Available models:", availableModels);
    
    // See if Demo model exists
    if (availableModels.includes("Demo") && availableModels.includes("Tag")) {
      console.log("Both Demo and Tag models exist, setting up subscriptions...");
      
      // Load tags first
      loadTags();
      
      // Set up subscription to Demo model
      try {
        const demoSubscription = client.models.Demo.observeQuery({}).subscribe({
          next: (data: SubscriptionData) => {
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
            console.error("Error in Demo subscription:", typedError.message);
            setIsLoading(false);
          }
        });

        // Set up subscription to Tag model
        const tagSubscription = client.models.Tag.observeQuery({}).subscribe({
          next: (data: TagSubscriptionData) => {
            const tagData = data.items.map(tag => ({
              id: tag.id,
              name: tag.name || "",
              color: tag.color || "#f89520"
            }));
            setAvailableTags(tagData);
            console.log("Tags updated via subscription:", tagData);
          },
          error: (err: AppError) => {
            const typedError = err as AppError;
            console.error("Error in Tag subscription:", typedError.message);
          }
        });

        // Set up subscription to DemoTag relationships
        const demoTagSubscription = client.models.DemoTag.observeQuery({}).subscribe({
          next: async (data: DemoTagSubscriptionData) => {
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
                      name: tagResponse.data.name || "",
                      color: tagResponse.data.color || "#f89520"
                    }
                  });
                }
              } catch (error) {
                console.error("Error fetching tag:", error);
              }
            }
            setDemoTags(enrichedDemoTags);
          },
          error: (err: AppError) => {
            const typedError = err as AppError;
            console.error("Error in DemoTag subscription:", typedError.message);
          }
        });
        
        return () => {
          demoSubscription.unsubscribe();
          tagSubscription.unsubscribe();
          demoTagSubscription.unsubscribe();
        };
      } catch (error) {
        const typedError = error as AppError;
        console.error("Error setting up subscriptions:", typedError.message);
        setIsLoading(false);
      }
    } else {
      console.error("Demo or Tag models don't exist yet!");
      console.log("Available models:", availableModels);
      setIsLoading(false);
    }
  }, []);

  // Get tag names and colors for display
  function getTagInfo(demo: DemoItem): Array<{ name: string; color: string }> {
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

  // Check if we're on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const isSmallMobile = typeof window !== 'undefined' && window.innerWidth <= 480;

  // UI part - Responsive clean user interface
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
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
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
              fontSize: isMobile ? '20px' : '24px'
            }}>
              Demo Catalog
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
          </div>
          
          <div style={{ 
            backgroundColor: '#333', 
            padding: '8px 16px', 
            borderRadius: '4px',
            color: '#ddd',
            fontSize: isMobile ? '12px' : '14px',
            textAlign: 'center'
          }}>
            {getFilteredDemos().length} Project{getFilteredDemos().length !== 1 ? 's' : ''}
          </div>
        </header>
        
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'white' }}>
            Loading demos...
          </div>
        ) : (
          <>
            {/* Filter Section */}
            <div style={{ 
              backgroundColor: '#222', 
              padding: isMobile ? '15px' : '20px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #333'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: 'white',
                  fontSize: isMobile ? '14px' : '16px'
                }}>
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
                      fontSize: isMobile ? '14px' : '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </label>
              </div>
              
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  color: 'white',
                  fontSize: isMobile ? '14px' : '16px'
                }}>
                  🏷️ Filter by Tags
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {availableTags.length > 0 ? (
                    availableTags.map(tag => (
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
                          fontSize: isMobile ? '12px' : '14px',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        {tag.name}
                      </button>
                    ))
                  ) : (
                    <div style={{ 
                      color: '#666', 
                      fontSize: isMobile ? '12px' : '14px',
                      padding: '8px 0'
                    }}>
                      Loading tags...
                    </div>
                  )}
                </div>
                
                {/* Filter Status */}
                {(searchTerm || selectedFilterTags.length > 0) && (
                  <div style={{ marginTop: '12px', color: '#ddd', fontSize: isMobile ? '12px' : '14px' }}>
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
                        fontSize: isMobile ? '12px' : '14px'
                      }}
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
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
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(248, 149, 32, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
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
                      fontSize: isMobile ? '16px' : '18px', 
                      marginTop: 0,
                      marginBottom: '12px'
                    }}>
                      {demo.projectName || "Unnamed Project"}
                    </h3>
                    
                    {/* Display Tags */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {getTagInfo(demo).map(tag => (
                          <span
                            key={tag.name}
                            style={{
                              padding: '3px 6px',
                              backgroundColor: tag.color,
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: isMobile ? '10px' : '12px'
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      gap: '10px',
                      marginTop: 'auto',
                      flexDirection: isSmallMobile ? 'column' : 'row'
                    }}>
                      {demo.githubLink && (
                        <a 
                          href={demo.githubLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            backgroundColor: '#333',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            flex: 1,
                            textAlign: 'center',
                            transition: 'background-color 0.2s',
                            fontSize: isMobile ? '12px' : '14px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#555';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#333';
                          }}
                        >
                          📁 GitHub
                        </a>
                      )}
                      
                      {demo.projectLink && (
                        <a 
                          href={demo.projectLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            backgroundColor: '#f89520',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            flex: 1,
                            textAlign: 'center',
                            transition: 'background-color 0.2s',
                            fontSize: isMobile ? '12px' : '14px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e67e00';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#f89520';
                          }}
                        >
                          🚀 Live Demo
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {getFilteredDemos().length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px', 
                backgroundColor: '#222', 
                color: 'white',
                borderRadius: '8px',
                border: '1px solid #333'
              }}>
                {demos.length === 0 ? (
                  <p style={{ marginBottom: '20px', fontSize: isMobile ? '14px' : '16px' }}>No demos available yet. Check back soon!</p>
                ) : (
                  <>
                    <p style={{ marginBottom: '20px', fontSize: isMobile ? '14px' : '16px' }}>
                      No projects match your current filters.
                    </p>
                    <p style={{ marginBottom: '20px', color: '#ddd', fontSize: isMobile ? '12px' : '14px' }}>
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
                        fontSize: isMobile ? '14px' : '16px'
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

export default UserInterface;