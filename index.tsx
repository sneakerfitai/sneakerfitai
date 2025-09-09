/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { h, render } from 'preact';
import { useState, useEffect, useCallback, useMemo } from 'preact/hooks';
import htm from 'htm';
import { GoogleGenAI } from "@google/genai";

// Initialize htm with Preact's hyperscript function
const html = htm.bind(h);

// FIX: Use process.env.API_KEY as required by the coding guidelines. This resolves the TypeScript error and aligns with the requirement that the API key is managed externally.
const GEMINI_API_KEY = process.env.API_KEY;

// --- ACTION REQUIRED ---
// 1. Go to https://mockapi.io and create a free account.
// 2. Create a new project and then a new "Resource" named "products".
// 3. Copy the endpoint URL and paste it below.
const API_ENDPOINT = 'https://68bfa9999c70953d96f01f7f.mockapi.io/products'; // 👈 PASTE YOUR MOCKAPI.IO URL HERE
const PRODUCTS_PER_PAGE = 20;

const App = () => {
    const [products, setProducts] = useState([]);
    const [newProductName, setNewProductName] = useState('');
    const [newProductLink, setNewProductLink] = useState('');
    const [newProductImage, setNewProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [isLoading, setIsLoading] = useState(false); // For form submission
    const [isAnalyzing, setIsAnalyzing] = useState(false); // For AI analysis
    const [isFetching, setIsFetching] = useState(true); // For initial product load
    const [isFetchingMore, setIsFetchingMore] = useState(false); // For "Load More"
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    // Initialize the Google AI client safely
    const ai = useMemo(() => {
        if (!GEMINI_API_KEY) return null;
        try {
            return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        } catch (error) {
            console.error("Failed to initialize GoogleGenAI:", error);
            return null;
        }
    }, [GEMINI_API_KEY]);

    const isAiConfigured = !!ai;

    const fetchProducts = useCallback(async (currentPage) => {
        if (!API_ENDPOINT) {
            console.warn("API endpoint not configured. Please add your MockAPI URL.");
            setIsFetching(false);
            return;
        }

        const url = `${API_ENDPOINT}?page=${currentPage}&limit=${PRODUCTS_PER_PAGE}&sortBy=createdAt&order=desc`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Network response was not ok. Is the API endpoint correct?');
            }
            const data = await response.json();
            
            if (data.length < PRODUCTS_PER_PAGE) {
                setHasMore(false);
            }

            if (currentPage === 1) {
                setProducts(data);
            } else {
                setProducts(prevProducts => [...prevProducts, ...data]);
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
            // Don't clear products on subsequent page load failures
            if (currentPage === 1) {
                setProducts([]);
            }
        } finally {
            if (currentPage === 1) {
                setIsFetching(false);
            } else {
                setIsFetchingMore(false);
            }
        }
    }, []);

    // Effect for initial product fetch
    useEffect(() => {
        setIsFetching(true);
        fetchProducts(1);
    }, [fetchProducts]);


    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewProductImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newProductName || !newProductLink || !imagePreview || !isAiConfigured) {
            alert('Please fill all fields, select an image, and ensure the AI is configured.');
            return;
        }

        setIsLoading(true);
        let colorTags = [];

        // Step 1: AI Color Analysis
        try {
            setIsAnalyzing(true);
            const mimeType = imagePreview.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1];
            const imagePart = {
                inlineData: {
                    mimeType,
                    data: imagePreview.split(',')[1],
                },
            };
            const prompt = "Analyze the dominant colors in this image. Respond with a JSON array of 3-5 simple color names (e.g., [\"black\", \"white\", \"green\"]). Respond ONLY with the JSON array, without any markdown formatting or other text.";

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [imagePart, { text: prompt }] },
            });

            // Clean up potential markdown and parse the JSON response
            let jsonString = response.text.trim();
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.substring(7, jsonString.length - 3).trim();
            }
            colorTags = JSON.parse(jsonString);
        } catch (aiError) {
            console.error("AI color analysis failed, proceeding without tags:", aiError);
            // Fail gracefully: if AI fails, we still add the product without tags.
        } finally {
            setIsAnalyzing(false);
        }
        
        // Step 2: Save product to MockAPI
        const newProductData = {
            name: newProductName,
            link: newProductLink,
            imageSrc: imagePreview,
            createdAt: new Date().toISOString(),
            colorTags: colorTags, // Add the generated tags
        };

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProductData),
            });

            if (!response.ok) {
                throw new Error('Failed to create product on the server.');
            }

            const createdProduct = await response.json();
            setProducts(prevProducts => [createdProduct, ...prevProducts]);

            // Reset form
            setNewProductName('');
            setNewProductLink('');
            setNewProductImage(null);
            setImagePreview('');
            (document.getElementById('image-upload') as HTMLInputElement).value = null;

        } catch (error) {
            console.error('Error adding product:', error);
            alert('Failed to add product. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (productId) => {
        const originalProducts = [...products];
        setProducts(products.filter(p => p.id !== productId));

        try {
            const response = await fetch(`${API_ENDPOINT}/${productId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                setProducts(originalProducts);
                throw new Error('Failed to delete product on the server.');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product. The item has been restored.');
            setProducts(originalProducts);
        }
    };
    
    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        setIsFetchingMore(true);
        fetchProducts(nextPage);
    };

    const isFormValid = newProductName && newProductLink && newProductImage && isAiConfigured;
    
    const getButtonText = () => {
        if (isAnalyzing) return 'Analyzing Image...';
        if (isLoading) return 'Adding Product...';
        return 'Add Product';
    };

    const filteredProducts = products.filter(product => {
        const searchTermLower = searchTerm.toLowerCase();
        const inName = product.name.toLowerCase().includes(searchTermLower);
        const inTags = product.colorTags && Array.isArray(product.colorTags) 
            ? product.colorTags.some(tag => tag.toLowerCase().includes(searchTermLower))
            : false;
        return inName || inTags;
    });

    return html`
        <div class="app-container">
            <header class="header">
                <h1>Affiliate Product Manager</h1>
                <p>Add, manage, and automatically tag your affiliate products with AI.</p>
            </header>

            <main>
                <section class="form-card" aria-labelledby="form-heading">
                    <h2 id="form-heading">Add New Product</h2>
                    <form onSubmit=${handleSubmit}>
                        <fieldset disabled=${!isAiConfigured}>
                            <div class="form-group">
                                <label for="productName">Product Name</label>
                                <input type="text" id="productName" value=${newProductName} onInput=${(e) => setNewProductName(e.target.value)} placeholder="e.g., Ergonomic Keyboard" required />
                            </div>
                            <div class="form-group">
                                <label for="affiliateLink">Affiliate Link</label>
                                <input type="url" id="affiliateLink" value=${newProductLink} onInput=${(e) => setNewProductLink(e.target.value)} placeholder="https://example.com/product" required />
                            </div>
                            <div class="form-group">
                               <label>Product Image</label>
                               <div class="image-upload-wrapper">
                                    <div class="image-preview" aria-label="Image preview">
                                        ${imagePreview ? html`<img src=${imagePreview} alt="Preview" />` : html`<span>Preview</span>`}
                                    </div>
                                    <div>
                                        <label for="image-upload" class="file-input-label">Choose an image</label>
                                        <input type="file" id="image-upload" accept="image/*" onChange=${handleImageChange} required />
                                    </div>
                               </div>
                            </div>
                            <button type="submit" class="btn btn-primary" disabled=${!isFormValid || isLoading}>
                                ${isLoading || isAnalyzing ? html`<div class="spinner"></div>` : ''}
                                ${getButtonText()}
                            </button>
                        </fieldset>
                    </form>
                </section>

                <section class="product-list-container" aria-labelledby="products-heading">
                     <div class="list-header">
                        <h2 id="products-heading">Your Products</h2>
                        <div class="search-wrapper">
                             <input type="text" class="search-input" placeholder="Search by name or color..." value=${searchTerm} onInput=${(e) => setSearchTerm(e.target.value)} />
                        </div>
                     </div>
                     ${isFetching ? html`
                        <div class="loader-container">
                            <div class="spinner"></div>
                            <p>Loading products...</p>
                        </div>
                     ` : !API_ENDPOINT ? html`
                        <div class="config-needed-card">
                            <div class="config-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div class="config-content">
                                <h2>Action Required: Configure Your API</h2>
                                <p>Your app is ready, but it needs a cloud backend to save data. Follow these steps:</p>
                                <ol>
                                    <li>Go to <a href="https://mockapi.io/" target="_blank" rel="noopener noreferrer">mockapi.io</a> and create a free account.</li>
                                    <li>Create a new project, then a new <strong>resource</strong> named <code>products</code>.</li>
                                    <li>Copy the unique API endpoint URL provided.</li>
                                </ol>
                                <p>Finally, open <code>index.tsx</code> and paste your URL into this line:</p>
                                <pre><code>const API_ENDPOINT = '';</code></pre>
                            </div>
                        </div>
                     `: products.length === 0 ? html`
                        <p>You haven't added any products yet. Add one using the form above!</p>
                     ` : filteredProducts.length === 0 && searchTerm ? html`
                        <p>No products match your search.</p>
                     ` : html`
                         <div class="product-list">
                            ${filteredProducts.map(product => html`
                                <div class="product-card" key=${product.id}>
                                    <img class="product-card-image" src=${product.imageSrc} alt=${product.name} />
                                    <div class="product-card-content">
                                        <h3>${product.name}</h3>
                                        ${product.colorTags && product.colorTags.length > 0 && html`
                                            <div class="color-tags">
                                                ${product.colorTags.map(tag => html`<span class="color-tag">${tag}</span>`)}
                                            </div>
                                        `}
                                        <div class="spacer"></div>
                                        <div class="product-card-actions">
                                            <a href=${product.link} target="_blank" rel="noopener noreferrer" class="btn btn-secondary">Visit Link</a>
                                            <button onClick=${() => handleDelete(product.id)} class="btn btn-danger" aria-label=${`Delete ${product.name}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `)}
                         </div>
                         ${hasMore && !searchTerm && !isFetchingMore && html`
                            <div class="load-more-container">
                                <button onClick=${handleLoadMore} class="btn btn-primary">Load More</button>
                            </div>
                         `}
                         ${isFetchingMore && html`
                            <div class="loader-container">
                                <div class="spinner"></div>
                                <p>Loading more...</p>
                            </div>
                         `}
                     `}
                </section>
            </main>
        </div>
    `;
}

render(html`<${App} />`, document.getElementById('root'));