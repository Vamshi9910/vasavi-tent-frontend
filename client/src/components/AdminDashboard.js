import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [editProducts, setEditProducts] = useState([]);
  const [editReceived, setEditReceived] = useState(false);
  const [receivedProducts, setReceivedProducts] = useState([]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('https://vasavi-backend-2.onrender.com/api/order', {
        headers: {
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      // Process the orders to ensure all quantities are properly formatted
      const processedOrders = res.data.map(order => ({
        ...order,
        products: order.products.map(product => ({
          ...product,
          quantity: Number(product.quantity) || 0,
          receivedQuantity: Number(product.receivedQuantity) || 0,
          pendingQuantity: Math.max(Number(product.quantity) - Number(product.receivedQuantity), 0)
        }))
      }));
      setOrders(processedOrders);
      setError('');
    } catch (err) {
      console.error('Error fetching orders:', err);
      if (err.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else {
        setError(`Failed to load orders: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders
    .filter(order => {
      const matchesSearch = order.name.toLowerCase().includes(search.toLowerCase()) ||
                          order.mobile.includes(search) ||
                          order.village.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || order.status === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc' 
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date);
      }
      if (sortBy === 'total') {
        return sortOrder === 'desc'
          ? Number(b.totalBill) - Number(a.totalBill)
          : Number(a.totalBill) - Number(b.totalBill);
      }
      return 0;
    });

  const stats = {
    total: orders.length,
    pending: orders.filter(order => order.status === 'pending').length,
    completed: orders.filter(order => order.status === 'completed').length,
    totalRevenue: orders.reduce((sum, order) => sum + Number(order.totalBill), 0)
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await axios.patch(`https://vasavi-backend-2.onrender.com/api/order/${orderId}`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update order status');
    }
  };

  const openEditModal = (order) => {
    setEditOrder(order);
    setEditProducts(order.products.map(p => ({ ...p })));
  };

  const handleEditProductChange = (index, value) => {
    const updated = [...editProducts];
    updated[index].quantity = value;
    setEditProducts(updated);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.patch(`https://vasavi-backend-2.onrender.com/api/order/${editOrder._id}`, { products: editProducts });
      setEditOrder(null);
      setEditProducts([]);
      fetchOrders();
    } catch (err) {
      setError('Failed to update order quantities');
    }
  };

  const openReceivedEdit = (order) => {
    setEditReceived(true);
    setReceivedProducts(order.products.map(p => ({
      item: p.item,
      quantity: Number(p.quantity) || 0,
      receivedQuantity: Number(p.receivedQuantity) || 0
    })));
  };

  const handleReceivedChange = (index, value) => {
    let num = Number(value);
    if (isNaN(num) || value === '') num = 0;
    if (num < 0) num = 0;
    const max = Number(receivedProducts[index].quantity) || 0;
    if (num > max) num = max;
    
    const updated = [...receivedProducts];
    updated[index] = {
      ...updated[index],
      receivedQuantity: num
    };
    setReceivedProducts(updated);
  };

  const handleSaveReceived = async () => {
    try {
      // Prepare the data in the exact format expected by MongoDB
      const updatedProducts = receivedProducts.map(product => ({
        item: product.item,
        quantity: Number(product.quantity) || 0,
        receivedQuantity: Number(product.receivedQuantity) || 0
      }));

      // Send the update to MongoDB
      const response = await axios.patch(`https://vasavi-backend-2.onrender.com/api/order/${selectedOrder._id}`, {
        products: updatedProducts,
        status: updatedProducts.every(p => (Number(p.quantity) - Number(p.receivedQuantity)) === 0) ? 'completed' : 'pending'
      });

      if (response.data) {
        // Refresh orders and update the selected order
        await fetchOrders();
        const updatedOrder = orders.find(o => o._id === selectedOrder._id);
        if (updatedOrder) {
          setSelectedOrder(updatedOrder);
        }
        setEditReceived(false);
        setReceivedProducts([]);
      }
    } catch (err) {
      console.error('Error saving received quantities:', err);
      setError('Failed to update received quantities');
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    const order = selectedOrder;

    // Filter products to only include those with quantities
    const filteredProducts = order.products.filter(product => 
      Number(product.quantity) > 0
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>Order Receipt - Vasavi Tent House</title>
          <style>
            @media print {
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                color: #333;
              }
              .receipt {
                max-width: 400px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid #ddd;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 2px solid #b08d57;
                padding-bottom: 10px;
              }
              .business-name {
                font-size: 24px;
                font-weight: bold;
                color: #b08d57;
                margin-bottom: 5px;
              }
              .business-address {
                font-size: 14px;
                color: #666;
                margin-bottom: 5px;
              }
              .customer-details {
                margin: 20px 0;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 5px;
                border: 1px solid #eee;
              }
              .customer-details p {
                margin: 8px 0;
                font-size: 14px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
              }
              th, td {
                padding: 10px;
                text-align: left;
                border: 1px solid #ddd;
                font-size: 14px;
              }
              th {
                background: #f0f0f0;
                font-weight: bold;
              }
              .total {
                text-align: right;
                font-weight: bold;
                margin-top: 20px;
                padding: 15px;
                border-top: 2px solid #b08d57;
                font-size: 16px;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 12px;
                color: #666;
                border-top: 1px solid #eee;
                padding-top: 15px;
              }
              .footer p {
                margin: 5px 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="business-name">Vasavi Tent House & Decorations</div>
              <div class="business-address">Cherupalle, Mangapet, Mulugu - 506172</div>
              <div>Phone: +91 9121154704</div>
            </div>

            <div class="customer-details">
              <p><strong>Customer Name:</strong> ${order.name}</p>
              <p><strong>Mobile:</strong> ${order.mobile}</p>
              <p><strong>Village:</strong> ${order.village}</p>
              <p><strong>Date:</strong> ${new Date(order.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${filteredProducts.map(product => `
                  <tr>
                    <td>${product.item}</td>
                    <td>${Number(product.quantity)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total">
              Total Bill: ₹${Number(order.totalBill).toLocaleString()}
            </div>

            <div class="footer">
              <p>Thank you for choosing Vasavi Tent House!</p>
              <p>This is a computer generated receipt.</p>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <div className="admin-controls">
          <input
            type="text"
            placeholder="Search by name, mobile, or village"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="date">Sort by Date</option>
            <option value="total">Sort by Total</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="sort-btn"
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="stats-container">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <p>{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Pending Orders</h3>
          <p>{stats.pending}</p>
        </div>
        <div className="stat-card">
          <h3>Completed Orders</h3>
          <p>{stats.completed}</p>
        </div>
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <p>₹{stats.totalRevenue}</p>
        </div>
      </div>

      <div className="orders-table-container">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer Details</th>
              <th>Contact & Amount</th>
              <th>Status & Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order._id} className={order.status === 'completed' ? 'completed' : ''}>
                <td>
                  {new Date(order.date).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </td>
                <td>
                  <div className="customer-info">
                    <span className="customer-name">{order.name}</span>
                    <span className="customer-village">{order.village}</span>
                  </div>
                </td>
                <td>
                  <div className="contact-amount-info">
                    <div className="mobile-number">{order.mobile}</div>
                    <div className="total-amount">₹{Number(order.totalBill).toLocaleString()}</div>
                  </div>
                </td>
                <td>
                  <div className="status-actions-container">
                    <span className={`status-badge ${order.status}`}>
                      {order.status}
                    </span>
                    <div className="action-buttons">
                      {order.status !== 'completed' && (
                        <button
                          className="status-btn"
                          onClick={() => handleStatusUpdate(order._id, 'completed')}
                        >
                          Mark as Complete
                        </button>
                      )}
                      <button
                        className="view-btn"
                        onClick={() => setSelectedOrder(order)}
                      >
                        View
                      </button>
                      {order.status === 'pending' && (
                        <button
                          className="view-btn"
                          onClick={() => openEditModal(order)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="modal">
          <div className="modal-content">
            <h3>Order Details</h3>
            <div className="order-details">
              {editReceived ? (
                receivedProducts.map((product, index) => {
                  const original = Number(product.quantity) || 0;
                  const received = Number(product.receivedQuantity) || 0;
                  const pending = Math.max(original - received, 0);
                  return (
                    <div key={index} className="product-item">
                      <span>{product.item}</span>
                      <span>Ordered: {original}</span>
                      <span>
                        Received: <input
                          type="number"
                          min="0"
                          max={original}
                          value={received === 0 ? '' : received}
                          onChange={e => handleReceivedChange(index, e.target.value)}
                        />
                      </span>
                      <span className={pending > 0 ? 'pending-text' : 'completed-text'}>
                        Pending: {pending}
                      </span>
                    </div>
                  );
                })
              ) : (
                selectedOrder.products.map((product, index) => {
                  const original = Number(product.quantity) || 0;
                  const received = selectedOrder.status === 'completed' ? 0 : Number(product.receivedQuantity) || 0;
                  const pending = selectedOrder.status === 'completed' ? 0 : Math.max(original - received, 0);
                  return (
                    <div key={index} className="product-item">
                      <span>{product.item}</span>
                      <span>Ordered: {original}</span>
                      <span>Received: {received}</span>
                      <span className={pending > 0 ? 'pending-text' : 'completed-text'}>
                        Pending: {pending}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            {editReceived ? (
              <>
                <button className="close-btn" onClick={() => setEditReceived(false)}>Cancel</button>
                <button className="submit-btn" onClick={handleSaveReceived}>Save</button>
              </>
            ) : (
              <>
                {selectedOrder.status !== 'completed' && (
                  <button className="submit-btn" onClick={() => openReceivedEdit(selectedOrder)}>
                    Edit Received
                  </button>
                )}
                <button className="submit-btn print" onClick={handlePrintReceipt}>
                  Print Receipt
                </button>
              </>
            )}
            <button className="close-btn" onClick={() => setSelectedOrder(null)}>Close</button>
          </div>
        </div>
      )}

      {editOrder && (
        <div className="modal">
          <div className="modal-content">
            <h3>Edit Product Quantities</h3>
            <div className="order-details">
              {editProducts.map((product, idx) => (
                <div key={idx} className="product-item">
                  <span>{product.item}</span>
                  <input
                    type="number"
                    min="0"
                    value={product.quantity}
                    onChange={e => handleEditProductChange(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <button className="close-btn" onClick={() => setEditOrder(null)}>Cancel</button>
            <button className="submit-btn" onClick={handleSaveEdit}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
