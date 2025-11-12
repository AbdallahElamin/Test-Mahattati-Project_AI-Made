const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult, query } = require('express-validator');
const supabase = require('../config/database');
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

    const { data: newAd, error: insertError } = await supabase
      .from('ads')
      .insert({
        user_id: req.user.id,
        title,
        description: description || null,
        location_latitude,
        location_longitude,
        address: address || null,
        city: city || null,
        region: region || null,
        facilities: facilities ? (typeof facilities === 'string' ? JSON.parse(facilities) : facilities) : null,
        fuel_types: fuel_types ? (typeof fuel_types === 'string' ? JSON.parse(fuel_types) : fuel_types) : null,
        images: images,
        status: 'draft'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Create ad error:', insertError);
      return res.status(500).json({ message: 'Server error' });
    }

    res.status(201).json({ ad: newAd });
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
    let adsQuery = supabase.from('ads').select('*').eq('status', status);

    // Advertisers see only their own ads
    if (req.user.role === 'advertiser') {
      adsQuery = adsQuery.eq('user_id', req.user.id);
    }

    // Subscribers see all published ads
    if (req.user.role === 'subscriber') {
      // Can filter by region, city, or proximity
      if (region) {
        adsQuery = adsQuery.eq('region', region);
      }
      if (city) {
        adsQuery = adsQuery.eq('city', city);
      }
      if (latitude && longitude && radius) {
        // Note: Supabase PostGIS extension would be needed for proper distance calculations
        // For now, we'll use a simpler bounding box approach or implement PostGIS
        // This is a simplified version - for production, use PostGIS with ST_DWithin
        // For now, just limit results
      }
    }

    adsQuery = adsQuery.order('created_at', { ascending: false }).limit(100);

    const { data: ads, error } = await adsQuery;

    if (error) {
      console.error('Get ads error:', error);
      return res.status(500).json({ message: 'Server error' });
    }

    // Supabase automatically handles JSON fields, but ensure they're arrays if null
    const parsedAds = (ads || []).map(ad => ({
      ...ad,
      facilities: ad.facilities || [],
      fuel_types: ad.fuel_types || [],
      images: ad.images || []
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

    let adQuery = supabase.from('ads').select('*').eq('id', id);

    // Advertisers can only see their own ads
    if (req.user.role === 'advertiser') {
      adQuery = adQuery.eq('user_id', req.user.id);
    } else {
      adQuery = adQuery.eq('status', 'published');
    }

    const { data: ad, error: findError } = await adQuery.single();

    if (findError || !ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }

    // Increment views if subscriber
    if (req.user.role === 'subscriber') {
      await supabase
        .from('ads')
        .update({ views_count: (ad.views_count || 0) + 1 })
        .eq('id', id);
    }

    // Supabase automatically handles JSON fields
    ad.facilities = ad.facilities || [];
    ad.fuel_types = ad.fuel_types || [];
    ad.images = ad.images || [];

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
    const { data: ad, error: findError } = await supabase
      .from('ads')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    if (ad.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this ad' });
    }

    const updateData = {};

    const allowedFields = ['title', 'description', 'location_latitude', 'location_longitude', 
                          'address', 'city', 'region', 'facilities', 'fuel_types', 'status'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'facilities' || field === 'fuel_types') {
          updateData[field] = typeof req.body[field] === 'string' ? JSON.parse(req.body[field]) : req.body[field];
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    if (req.files && req.files.length > 0) {
      const images = req.files.map(file => `/uploads/ads/${file.filename}`);
      updateData.images = images;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    const { data: updatedAd, error: updateError } = await supabase
      .from('ads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedAd) {
      return res.status(500).json({ message: 'Server error updating ad' });
    }

    const resultAd = updatedAd;
    resultAd.facilities = resultAd.facilities || [];
    resultAd.fuel_types = resultAd.fuel_types || [];
    resultAd.images = resultAd.images || [];

    res.json({ ad: resultAd });
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

    const { data: ad, error: findError } = await supabase
      .from('ads')
      .select('user_id')
      .eq('id', id)
      .single();

    if (findError || !ad) {
      return res.status(404).json({ message: 'Ad not found' });
    }
    if (ad.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this ad' });
    }

    const { error: deleteError } = await supabase
      .from('ads')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return res.status(500).json({ message: 'Server error deleting ad' });
    }

    res.json({ message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Delete ad error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;



