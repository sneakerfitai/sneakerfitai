/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';

// Initialize htm with Preact's hyperscript function
const html = htm.bind(h);

// --- ACTION REQUIRED ---
// 1. Go to https://mockapi.io and create a free account.
// 2. Create a new project and then a new "Resource" named "products".
// 3. Copy the endpoint URL and paste it below, replacing the placeholder.
const API_ENDPOINT = 'https://68bfa9999c70953d96f01f7f.mockapi.io/products';

const App = () => {
    const [products, setProducts] = useState([]);
    const [newProductName, setNewProductName] = useState('');
    const [newProductLink, setNewProductLink] = useState('');
    const [newProductImage, setNewProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [isLoading, setIsLoading] = useState(false); // For form submission
    const [isFetching, setIsFetching] = useState(true); // For initial product load
    const [searchTerm, setSearchTerm] = useState('');

    // Effect to fetch products from the backend when the component mounts
    useEffect(() => {
        const fetchProducts = async () => {
            if (API_ENDPOINT.includes('https://68bfa9999c70953d96f01f7f.mockapi.io/products')) {
                console.warn("API endpoint not configured. Please add your MockAPI URL.");
                setIsFetching(false);
                return;
            }
            setIsFetching(true);
            try {
                const response = await fetch(API_ENDPOINT);
                if (!response.ok) {
                    throw new Error('Network response was not ok. Is the API endpoint correct?');
                }
                const data = await response.json();
                // MockAPI returns newest first, so we reverse to show newest at the top
                setProducts(data.reverse());
            } catch (error) {
                console.error("Failed to fetch products:", error);
                setProducts([]);
            } finally {
                setIsFetching(false);
            }
        };
        fetchProducts();
    }, []);


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
        if (!newProductName || !newProductLink || !imagePreview) {
            alert('Please fill all fields and select an image.');
            return;
        }

        setIsLoading(true);

        const newProductData = {
            name: newProductName,
            link: newProductLink,
            imageSrc: imagePreview, // Save the Base64 data URL of the image
            createdAt: new Date().toISOString(), // Add a timestamp
        };

        try {
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
        // Optimistic UI update: remove the product from the UI immediately.
        setProducts(products.filter(p => p.id !== productId));

        try {
            const response = await fetch(`${API_ENDPOINT}/${productId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                // If the delete fails on the server, revert the UI change.
                setProducts(originalProducts);
                throw new Error('Failed to delete product on the server.');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product. The item has been restored.');
            // Revert the UI change on any error.
            setProducts(originalProducts);
        }
    };

    const isFormValid = newProductName && newProductLink && newProductImage;

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return html`
        <div class="app-container">
            <header class="header">
                <h1>Affiliate Product Manager</h1>
                <p>Add and manage your affiliate products with ease.</p>
            </header>

            <main>
                <section class="form-card" aria-labelledby="form-heading">
                    <h2 id="form-heading">Add New Product</h2>
                    <form onSubmit=${handleSubmit}>
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
                            ${isLoading ? html`<div class="spinner"></div>` : ''}
                            ${isLoading ? 'Adding...' : 'Add Product'}
                        </button>
                    </form>
                </section>

                <section class="product-list-container" aria-labelledby="products-heading">
                     <div class="list-header">
                        <h2 id="products-heading">Your Products</h2>
                        <div class="search-wrapper">
                             <input type="text" class="search-input" placeholder="Search by product name..." value=${searchTerm} onInput=${(e) => setSearchTerm(e.target.value)} />
                        </div>
                     </div>
                     ${isFetching ? html`
                        <div class="loader-container">
                            <div class="spinner"></div>
                            <p>Loading products...</p>
                        </div>
                     ` : API_ENDPOINT.includes('https://68bfa9999c70953d96f01f7f.mockapi.io/products') ? html`
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
                                <p>Finally, open <code>index.tsx</code> and replace the placeholder URL in this line:</p>
                                <pre><code>const API_ENDPOINT = 'YOUR_MOCKAPI_URL_HERE';</code></pre>
                            </div>
                        </div>
                     `: products.length === 0 ? html`
                        <p>You haven't added any products yet. Add one using the form above!</p>
                     ` : filteredProducts.length === 0 ? html`
                        <p>No products match your search.</p>
                     ` : html`
                         <div class="product-list">
                            ${filteredProducts.map(product => html`
                                <div class="product-card" key=${product.id}>
                                    <img class="product-card-image" src=${product.imageSrc} alt=${product.name} />
                                    <div class="product-card-content">
                                        <h3>${product.name}</h3>
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
                     `}
                </section>
            </main>
        </div>
    `;
}

render(html`<${App} />`, document.getElementById('root'));