/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import htm from 'htm';

// Initialize htm with Preact's hyperscript function
const html = htm.bind(h);

const App = () => {
    const [products, setProducts] = useState([]);
    const [newProductName, setNewProductName] = useState('');
    const [newProductLink, setNewProductLink] = useState('');
    const [newProductImage, setNewProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

        // --- Backend Integration Point ---
        // In a real application, you would upload the image to a service like Vercel Blob
        // and then save the product details (name, link, image URL) to your database.
        // For this demo, we'll simulate an async operation and store in-memory.
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

        const newProduct = {
            id: Date.now(),
            name: newProductName,
            link: newProductLink,
            imageSrc: imagePreview, // In a real app, this would be the URL from your Blob storage
        };

        setProducts(prevProducts => [newProduct, ...prevProducts]);

        // Reset form
        setNewProductName('');
        setNewProductLink('');
        setNewProductImage(null);
        setImagePreview('');
        // Fix: Cast the element to HTMLInputElement to access the 'value' property.
        (document.getElementById('image-upload') as HTMLInputElement).value = null;
        setIsLoading(false);
    };

    const handleDelete = (productId) => {
        setProducts(products.filter(p => p.id !== productId));
    };

    const isFormValid = newProductName && newProductLink && newProductImage;

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
                     <h2 id="products-heading">Your Products</h2>
                     ${products.length === 0 ? html`<p>You haven't added any products yet. Add one using the form above!</p>` : ''}
                     <div class="product-list">
                        ${products.map(product => html`
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
                </section>
            </main>
        </div>
    `;
}

render(html`<${App} />`, document.getElementById('root'));