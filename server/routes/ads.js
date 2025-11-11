const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads/ads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ad-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// @route   POST /api/ads
// @desc    Create a new advertisement
// @access  Private (Advertiser)
router.post('/', authenticate, authorize('advertiser'), upload.array('images', 5), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('location_latitude').isFloat().withMessage('Valid latitude is required'),
  body('location_longitude').isFloat().withMessage('Valid longitude is required'),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('region').optional().trim(),
  body('facilities').optional().isJSON(),
  body('fuel_types').optional().isJSON()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      location_latitude,
      location_longitude,
      address,
      city,
      region,
      facilities,
      fuel_types
    } = req.body;

    const images = req.files ? req.files.map(file => `/uploads/ads/${file.filename}`) : [];

    const [result] = await pool.execute(
      `INSERT INTO ads (user_id, title, description, location_latitude, location_longitude, 
       address, city, region, facilities, fuel_types, images, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
      [
        req.user.id,
        title,
        description || null,
        location_latitude,
        location_longitude,
        address || null,
        city || null,
        region || null,
        facilities ? JSON.stringify(JSON.parse(facilities)) : null,
        fuel_types ? JSON.stringify(JSON.parse(fuel_types)) : null,
        JSON.stringify(images),
        'draft'
      ]
    );

    const [newAd] = await pool.execute(
      'SELECT * FROM ads WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ ad: newAd[0] });
  } catch (error) {
    console.error('Create ad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/ads
// @desc    Get all ads (filtered by user role)
// @access  Private
router.get('/', authenticate, [
  query('region').optional().trim(),
  query('city').optional().trim(),
  query('latitude').optional().isFloat(),
  query('longitude').optional().isFloat(),
  query('radius').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { region, city, latitude, longitude, radius, status = 'published' } = req.query;
    let query = 'SELECT * FROM ads WHERE status = ?';
    const params = [status];

    // Advertisers see only their own ads
    if (req.user.role === 'advertiser') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    // Subscribers see all published ads
    if (req.user.role === 'subscriber') {
      // Can filter by region, city, or proximity
      if (region) {
        query += ' AND region = ?';
        params.push(region);
      }
      if (city) {
        query += ' AND city = ?';
        params.push(city);
      }
      if (latitude && longitude && radius) {
        // Simple distance calculation (Haversine formula would be better for production)
        query += ` AND (
          (6371 * acos(cos(radians(?)) * cos(radians(location_latitude)) * 
          cos(radians(location_longitude) - radians(?)) + 
          sin(radians(?)) * sin(radians(location_latitude)))) <= ?
        )`;
        params.push(latitude, longitude, latitude, radius);
      }
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const [ads] = await pool.execute(query, params);

    // Parse JSON fields
    const parsedAds = ads.map(ad => ({
      ...ad,
      facilities: ad.facilities ? JSON.parse(ad.facilities) : [],
      fuel_types: ad.fuel_types ? JSON.parse(ad.fuel_types) : [],
      images: ad.images ? JSON.parse(ad.images) : []
    }));

    res.json({ ads: parsedAds });
  } catch (error) {
    console.error('Get ads error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/ads/:id
// @desc    Get single ad by ID
// @access  Private
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    let query = 'SELECT * FROM ads WHERE id = ?';
    const params = [id];

    // Advertisers can only see their own ads
    if (req.user.role === 'advertiser') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    } else {
      query += ' AND status = ?';
      params.push('published');
    }

    const [ads] = await pool.execute(query, params);

    if (ads.length === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    const ad = ads[0];

    // Increment views if subscriber
    if (req.user.role === 'subscriber') {
      await pool.execute(
        'UPDATE ads SET views_count = views_count + 1 WHERE id = ?',
        [id]
      );
    }

    // Parse JSON fields
    ad.facilities = ad.facilities ? JSON.parse(ad.facilities) : [];
    ad.fuel_types = ad.fuel_types ? JSON.parse(ad.fuel_types) : [];
    ad.images = ad.images ? JSON.parse(ad.images) : [];

    res.json({ ad });
  } catch (error) {
    console.error('Get ad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/ads/:id
// @desc    Update an advertisement
// @access  Private (Advertiser - own ads only)
router.put('/:id', authenticate, authorize('advertiser'), upload.array('images', 5), async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const [ads] = await pool.execute('SELECT user_id FROM ads WHERE id = ?', [id]);
    if (ads.length === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    if (ads[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this ad' });
    }

    const updateFields = [];
    const updateValues = [];

    const allowedFields = ['title', 'description', 'location_latitude', 'location_longitude', 
                          'address', 'city', 'region', 'facilities', 'fuel_types', 'status'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'facilities' || field === 'fuel_types') {
          updateFields.push(`${field} = ?`);
          updateValues.push(JSON.stringify(req.body[field]));
        } else {
          updateFields.push(`${field} = ?`);
          updateValues.push(req.body[field]);
        }
      }
    });

    if (req.files && req.files.length > 0) {
      const images = req.files.map(file => `/uploads/ads/${file.filename}`);
      updateFields.push('images = ?');
      updateValues.push(JSON.stringify(images));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    updateValues.push(id);
    await pool.execute(
      `UPDATE ads SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    const [updatedAd] = await pool.execute('SELECT * FROM ads WHERE id = ?', [id]);
    const ad = updatedAd[0];
    ad.facilities = ad.facilities ? JSON.parse(ad.facilities) : [];
    ad.fuel_types = ad.fuel_types ? JSON.parse(ad.fuel_types) : [];
    ad.images = ad.images ? JSON.parse(ad.images) : [];

    res.json({ ad });
  } catch (error) {
    console.error('Update ad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/ads/:id
// @desc    Delete an advertisement
// @access  Private (Advertiser - own ads only)
router.delete('/:id', authenticate, authorize('advertiser'), async (req, res) => {
  try {
    const { id } = req.params;

    const [ads] = await pool.execute('SELECT user_id FROM ads WHERE id = ?', [id]);
    if (ads.length === 0) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    if (ads[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this ad' });
    }

    await pool.execute('DELETE FROM ads WHERE id = ?', [id]);
    res.json({ message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Delete ad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


