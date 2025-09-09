/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';

// Initialize htm with Preact's hyperscript function
const html = htm.bind(h);

// A placeholder for the base URL of your future backend API.
// In a real app, you might use environment variables for this.
const API_BASE_URL = '/api';

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
            setIsFetching(true);
            try {
                // This fetch call will fail with a 404 error until you create a backend
                // server that responds to this endpoint.
                const response = await fetch(`${API_BASE_URL}/products`);
                if (!response.ok) {
                    throw new Error('Network response was not ok. Is the backend running?');
                }
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error("Failed to fetch products:", error);
                // In a real app, you'd show a persistent error message to the user.
                // For now, we'll just show an empty list.
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
        if (!newProductName || !newProductLink || !newProductImage) {
            alert('Please fill all fields and select an image.');
            return;
        }

        setIsLoading(true);

        // Use FormData to send the file and other data to the backend.
        // This is the standard way to handle file uploads.
        const formData = new FormData();
        formData.append('name', newProductName);
        formData.append('link', newProductLink);
        formData.append('image', newProductImage); // The actual file object

        try {
            const response = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                body: formData, // The browser will automatically set the correct 'Content-Type' header.
            });

            if (!response.ok) {
                throw new Error('Failed to create product on the server.');
            }

            const newProduct = await response.json(); // The server should return the newly created product.
            setProducts(prevProducts => [newProduct, ...prevProducts]);

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
            const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
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
                     ` : products.length === 0 ? html`
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