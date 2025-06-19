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
    <div className="admin-container" style={{ fontFamily: 'Inter, Segoe UI, Arial, sans-serif', background: '#f7f6f3', minHeight: '100vh' }}>
      <div className="admin-header" style={{ background: '#fff', padding: '24px 20px 10px 20px', borderBottom: '1px solid #f0e9e0', textAlign: 'left' }}>
        <h2 style={{ color: '#7a2f2f', fontSize: '2rem', fontWeight: 700, margin: '0 0 10px 0', letterSpacing: '1px' }}>Admin Dashboard</h2>
        <div className="admin-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 20px 10px 20px' }}>
          <input
            type="text"
            placeholder="Search by name, mobile, or village"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{ padding: '10px 14px', border: '1px solid #e7d7c1', borderRadius: '8px', background: '#f9f6ef', fontSize: '1rem', color: '#7a2f2f', outline: 'none', transition: 'border 0.2s' }}
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
            style={{ padding: '10px 14px', border: '1px solid #e7d7c1', borderRadius: '8px', background: '#f9f6ef', fontSize: '1rem', color: '#7a2f2f', outline: 'none', transition: 'border 0.2s' }}
          >
            <option value="all">All Orders</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
            style={{ padding: '10px 14px', border: '1px solid #e7d7c1', borderRadius: '8px', background: '#f9f6ef', fontSize: '1rem', color: '#7a2f2f', outline: 'none', transition: 'border 0.2s' }}
          >
            <option value="date">Sort by Date</option>
            <option value="total">Sort by Total</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="sort-btn"
            style={{ background: '#e7d7c1', color: '#7a2f2f', border: '1px solid #b08d57', borderRadius: '8px', padding: '8px 14px', fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s, color 0.2s' }}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div
        className="stats-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          maxWidth: '600px',
          margin: '24px auto'
        }}
      >
        <div className="stat-card" style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(176, 141, 87, 0.07)', border: '1px solid #f3e7d1', padding: '12px 8px', minWidth: '120px', flex: '1 1 120px', textAlign: 'center', margin: 0,marginRight: '20px' }}>
          <h3 style={{ color: '#b08d57', fontSize: '0.95rem', marginBottom: '4px', fontWeight: 600 }}>Total Orders</h3>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#7a2f2f', margin: 0 }}>{stats.total}</p>
        </div>
        <div className="stat-card" style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(176, 141, 87, 0.07)', border: '1px solid #f3e7d1', padding: '12px 8px', minWidth: '120px', flex: '1 1 120px', textAlign: 'center', margin: 0 }}>
          <h3 style={{ color: '#b08d57', fontSize: '0.95rem', marginBottom: '4px', fontWeight: 600 }}>Pending Orders</h3>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#7a2f2f', margin: 0 }}>{stats.pending}</p>
        </div>
        <div className="stat-card" style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(176, 141, 87, 0.07)', border: '1px solid #f3e7d1', padding: '12px 8px', minWidth: '120px', flex: '1 1 120px', textAlign: 'center', margin: 0 }}>
          <h3 style={{ color: '#b08d57', fontSize: '0.95rem', marginBottom: '4px', fontWeight: 600 }}>Completed Orders</h3>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#7a2f2f', margin: 0 }}>{stats.completed}</p>
        </div>
        <div className="stat-card" style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(176, 141, 87, 0.07)', border: '1px solid #f3e7d1', padding: '12px 8px', minWidth: '120px', flex: '1 1 120px', textAlign: 'center', margin: 0 }}>
          <h3 style={{ color: '#b08d57', fontSize: '0.95rem', marginBottom: '4px', fontWeight: 600 }}>Total Revenue</h3>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#7a2f2f', margin: 0 }}>₹{stats.totalRevenue}</p>
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

        <div className="mobile-orders-container">
          {filteredOrders.map((order) => (
            <div key={order._id} className={`mobile-order-card ${order.status === 'completed' ? 'completed' : ''}`} style={{ background: '#fff', borderRadius: '10px', boxShadow: '0 1px 4px rgba(176, 141, 87, 0.07)', border: '1px solid #f3e7d1', marginBottom: '10px', padding: '10px 6px', width: '100%', boxSizing: 'border-box', marginRight: '8px' }}>
              <div className="mobile-order-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <span className="mobile-order-date" style={{ background: '#f9f6ef', padding: '3px 8px', borderRadius: '10px', fontSize: '0.85rem', color: '#7a2f2f', fontWeight: 600 }}>{new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className={`mobile-status-badge ${order.status}`} style={{ background: order.status === 'pending' ? '#fff3e0' : '#e8f5e9', color: order.status === 'pending' ? '#e65100' : '#2e7d32', borderRadius: '10px', padding: '3px 8px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{order.status}</span>
              </div>
              <div className="mobile-customer-info" style={{ marginBottom: '4px' }}>
                <div className="mobile-customer-name" style={{ fontSize: '1rem', fontWeight: 700, color: '#7a2f2f' }}>{order.name}</div>
                <div className="mobile-customer-village" style={{ fontSize: '0.85rem', color: '#b08d57' }}>{order.village}</div>
              </div>
              <div className="mobile-contact-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', padding: '4px 0', borderTop: '1px solid #f3e7d1', borderBottom: '1px solid #f3e7d1' }}>
                <span className="mobile-phone" style={{ fontSize: '0.85rem', color: '#7a2f2f', fontWeight: 500 }}>{order.mobile}</span>
                <span className="mobile-amount" style={{ fontSize: '1rem', fontWeight: 700, color: '#b08d57' }}>₹{Number(order.totalBill).toLocaleString()}</span>
              </div>
              <div className="mobile-actions" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  className="mobile-btn primary"
                  style={{ flex: 1, minWidth: '60px', padding: '5px 7px', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center', background: '#e7d7c1', color: '#7a2f2f', border: '1px solid #b08d57', transition: 'background 0.2s, color 0.2s' }}
                  onClick={() => setSelectedOrder(order)}
                >
                  View Details
                </button>
                {order.status !== 'completed' && (
                  <button
                    className="mobile-btn success"
                    style={{ flex: 1, minWidth: '60px', padding: '5px 7px', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #b8e6c1', transition: 'background 0.2s, color 0.2s' }}
                    onClick={() => handleStatusUpdate(order._id, 'completed')}
                  >
                    Mark Complete
                  </button>
                )}
                {order.status === 'pending' && (
                  <button
                    className="mobile-btn secondary"
                    style={{ flex: 1, minWidth: '60px', padding: '5px 7px', border: 'none', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textAlign: 'center', background: '#f9f6ef', color: '#7a2f2f', border: '1px solid #e7d7c1', transition: 'background 0.2s, color 0.2s' }}
                    onClick={() => openEditModal(order)}
                  >
                    Edit Order
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
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
