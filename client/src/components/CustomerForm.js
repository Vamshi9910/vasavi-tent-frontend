import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CustomerForm.css';

const predefinedProducts = ['100kgs','80kgs','70kgs','60kgs','50kgs','40kgs','30kgs','20kgs','10kgs','5kgs',"అల్యూమినియం జల్లి బుట్టలు",
  "లగన్", 'హ్యాండ్ లెస్ కుర్చీలు','బల్లలు','టెంట్లు 36X36','టెంట్లు 18x36','టెంట్లు 15x30','టెంట్లు 12x24','టెంట్లు 9x18','సైడ్ వాల్స్','కార్పెట్స్','డబుల్ గ్యాస్ పొయ్యిలు','కాడ గిన్నెలు',"ట్రబ్బులు",'బకెట్స్','బేసిన్లు','జగ్గులు','కొబ్బరి తురుము','కురిఫీలు','డ్రమ్ములు','జిల్లి గంటెలు','ఇనువ పొయ్యిలు','ఇనుప గంటెలు','సాంబారు గంటెలు','కూర గంటెలు','హస్తాలు','కర్రలు','ఇనుప పైపులు','మేకులు','టీ ప్లాస్కో'];

const CustomerForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    village: '',
    date: new Date().toISOString().split('T')[0],
    products: predefinedProducts.map(item => ({ item, quantity: '' })),
    totalBill: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleQuantityChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;
    
    const updated = [...formData.products];
    updated[index].quantity = value;
    setFormData({ ...formData, products: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Filter out products with empty quantities
    const filteredProducts = formData.products.filter(product => product.quantity !== '');

    // Prepare the data
    const orderData = {
      ...formData,
      products: filteredProducts,
      date: new Date(formData.date).toISOString(), // Ensure date is properly formatted
      totalBill: formData.totalBill,
      status: 'pending'
    };

    try {
      console.log('Submitting form data:', orderData);
      const response = await axios.post('https://vasavi-backend-2.onrender.com/api/order', orderData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });
      console.log('Server response:', response.data);
      setSuccessMessage('Order submitted successfully!');
      setFormData({
        name: '',
        mobile: '',
        village: '',
        date: new Date().toISOString().split('T')[0],
        products: predefinedProducts.map(item => ({ item, quantity: '' })),
        totalBill: '',
      });
    } catch (err) {
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        data: orderData
      });
      if (err.code === 'ECONNABORTED') {
        alert('The server is taking longer than usual to respond. Please try again in a few moments.');
      } else {
        alert(`Failed to submit order: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="form-container">
      <div className="form-header">
        <img src={require('../logo.png')} alt="Vasavi Tent House Logo" className="vasavi-logo" />
        <h2>Vasavi Tent House & Decorations</h2>
        <p className="address">Cherupalle, Mangapet, Mulugu - 506172</p>
      </div>

      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="booking-form">
        <div className="form-section">
          <h3>Customer Details</h3>
          <div className="input-row">
            <div className="input-group">
              <label>Customer Name</label>
              <input 
                placeholder="Enter your name" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                required 
              />
            </div>
            <div className="input-group">
              <label>Mobile Number</label>
              <input 
                placeholder="Enter mobile number" 
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} 
                required 
              />
            </div>
            <div className="input-group">
              <label>Village</label>
              <input 
                placeholder="Enter village name" 
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })} 
                required 
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Event Details</h3>
          <div className="input-row">
            <div className="input-group">
              <label>Event Date</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                required 
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Products & Services</h3>
          <table className="product-table">
            <thead>
              <tr>
                <th>Product Item</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {formData.products.map((prod, index) => (
                <tr key={index}>
                  <td>{prod.item}</td>
                  <td>
                    <input
                      type="text"
                      value={prod.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      placeholder="Enter quantity"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="form-section">
          <div className="input-group">
            <label>Total Bill Amount</label>
            <input
              type="number"
              placeholder="Enter total bill amount"
              value={formData.totalBill}
              onChange={(e) => setFormData({ ...formData, totalBill: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="total-section">
          <button 
            type="submit" 
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;

