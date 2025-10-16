export const products = [
  {
    id: 1,
    name: 'Premium Cotton Bedsheet Set',
    category: 'Bedsheets',
    price: 89.99,
    originalPrice: 129.99,
    image: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1631049035463-7c2b5c3e4e18?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&h=500&fit=crop'
    ],
    rating: 4.8,
    reviewCount: 156,
    stock: 45,
    description: 'Luxurious 100% Egyptian cotton bedsheet set with 400 thread count. Includes fitted sheet, flat sheet, and 2 pillowcases. Machine washable and pre-shrunk for lasting quality.',
    badge: 'BEST SELLER',
    colors: ['White', 'Gray', 'Navy Blue', 'Beige'],
    sizes: ['Twin', 'Full', 'Queen', 'King'],
    tags: ['bedsheet', 'cotton', 'egyptian', 'luxury', 'soft', 'bed', 'sheet', 'premium', 'quality'],
    reviews: [
      {
        id: 1,
        userId: 1,
        userName: 'Sarah Johnson',
        rating: 5,
        comment: 'Absolutely love these sheets! So soft and comfortable. Best purchase ever!',
        date: '2025-09-15',
        approved: true
      },
      {
        id: 2,
        userId: 2,
        userName: 'Michael Chen',
        rating: 4,
        comment: 'Great quality, though a bit pricey. Worth it for the comfort.',
        date: '2025-09-10',
        approved: true
      }
    ]
  },
  {
    id: 2,
    name: 'Memory Foam Pillow',
    category: 'Pillows',
    price: 45.99,
    originalPrice: 65.99,
    image: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=500&h=500&fit=crop'
    ],
    rating: 4.9,
    reviewCount: 203,
    stock: 78,
    description: 'Ergonomic memory foam pillow with cooling gel technology. Provides optimal neck and head support for a restful sleep. Hypoallergenic and dust mite resistant.',
    badge: 'BEST SELLER',
    colors: ['White'],
    sizes: ['Standard', 'Queen', 'King'],
    tags: ['pillow', 'memory foam', 'foam', 'ergonomic', 'cooling', 'neck support', 'sleep', 'comfortable'],
    reviews: [
      {
        id: 3,
        userId: 3,
        userName: 'Emily Rodriguez',
        rating: 5,
        comment: 'This pillow changed my sleep quality! No more neck pain in the morning.',
        date: '2025-09-20',
        approved: true
      }
    ]
  },
  {
    id: 3,
    name: 'Blackout Curtains Set',
    category: 'Curtains',
    price: 75.99,
    image: 'https://images.unsplash.com/photo-1578898886636-5c4ab2c2a8e6?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1578898886636-5c4ab2c2a8e6?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=500&h=500&fit=crop'
    ],
    rating: 4.6,
    reviewCount: 89,
    stock: 34,
    description: 'Triple-weave blackout curtains that block 99% of light and UV rays. Thermal insulated to reduce energy costs. Includes 2 panels with grommets for easy installation.',
    colors: ['Black', 'Gray', 'Navy', 'Ivory'],
    sizes: ['52x63', '52x84', '52x96'],
    tags: ['curtain', 'blackout', 'dark', 'window', 'drapes', 'thermal', 'insulated', 'light blocking'],
    reviews: []
  },
  {
    id: 4,
    name: 'Turkish Cotton Bath Towel Set',
    category: 'Towels',
    price: 39.99,
    originalPrice: 59.99,
    image: 'https://images.unsplash.com/photo-1622622641693-8f5830c51c02?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1622622641693-8f5830c51c02?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1600456899121-68eda5705257?w=500&h=500&fit=crop'
    ],
    rating: 4.7,
    reviewCount: 134,
    stock: 92,
    description: 'Luxurious Turkish cotton towel set (6 pieces): 2 bath towels, 2 hand towels, 2 washcloths. Ultra-absorbent and quick-drying. Machine washable.',
    badge: 'BEST SELLER',
    colors: ['White', 'Gray', 'Navy', 'Sage Green'],
    tags: ['towel', 'bath towel', 'cotton', 'turkish', 'absorbent', 'soft', 'bathroom', 'bath', 'luxury'],
    reviews: [
      {
        id: 4,
        userId: 4,
        userName: 'David Kim',
        rating: 5,
        comment: 'Super soft and absorbent. Feel like hotel quality!',
        date: '2025-09-18',
        approved: true
      }
    ]
  },
  {
    id: 5,
    name: 'Silk Pillowcase Set',
    category: 'Pillows',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1566934961680-4b43797969e2?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1566934961680-4b43797969e2?w=500&h=500&fit=crop'
    ],
    rating: 4.5,
    reviewCount: 67,
    stock: 56,
    description: 'Pure mulberry silk pillowcases that reduce hair frizz and prevent sleep creases. Hypoallergenic and temperature regulating. Set of 2.',
    colors: ['Champagne', 'Navy', 'Silver', 'Rose'],
    sizes: ['Standard', 'Queen', 'King'],
    tags: ['pillowcase', 'silk', 'mulberry', 'luxury', 'hair care', 'beauty', 'sleep', 'soft', 'pillow'],
    reviews: []
  },
  {
    id: 6,
    name: 'Linen Bedsheet Set',
    category: 'Bedsheets',
    price: 119.99,
    originalPrice: 159.99,
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=500&h=500&fit=crop'
    ],
    rating: 4.9,
    reviewCount: 178,
    stock: 23,
    description: '100% European linen bedsheet set. Naturally breathable and moisture-wicking. Gets softer with every wash. Perfect for all seasons.',
    badge: 'NEW ARRIVAL',
    colors: ['Natural', 'White', 'Charcoal', 'Dusty Rose'],
    sizes: ['Queen', 'King'],
    tags: ['bedsheet', 'linen', 'european', 'breathable', 'natural', 'luxury', 'bed', 'sheet', 'premium'],
    reviews: [
      {
        id: 5,
        userId: 5,
        userName: 'Lisa Anderson',
        rating: 5,
        comment: 'Worth every penny! The quality is exceptional.',
        date: '2025-09-22',
        approved: true
      }
    ]
  },
  {
    id: 7,
    name: 'Sheer Voile Curtains',
    category: 'Curtains',
    price: 35.99,
    image: 'https://images.unsplash.com/photo-1524230659092-07f99a75c013?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1524230659092-07f99a75c013?w=500&h=500&fit=crop'
    ],
    rating: 4.4,
    reviewCount: 45,
    stock: 67,
    description: 'Elegant sheer voile curtains that filter natural light while maintaining privacy. Rod pocket design. Set of 2 panels.',
    colors: ['White', 'Ivory', 'Gray'],
    sizes: ['52x63', '52x84', '52x96'],
    tags: ['curtain', 'sheer', 'voile', 'window', 'light', 'drapes', 'elegant', 'privacy'],
    reviews: []
  },
  {
    id: 8,
    name: 'Bamboo Bath Towel Set',
    category: 'Towels',
    price: 49.99,
    image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=500&h=500&fit=crop'
    ],
    rating: 4.8,
    reviewCount: 91,
    stock: 41,
    description: 'Eco-friendly bamboo towel set. Naturally antibacterial and odor-resistant. Softer than cotton with excellent absorbency. 6-piece set.',
    colors: ['White', 'Gray', 'Charcoal'],
    tags: ['towel', 'bamboo', 'eco-friendly', 'bath towel', 'antibacterial', 'soft', 'bathroom', 'sustainable'],
    reviews: []
  },
  {
    id: 9,
    name: 'Down Alternative Comforter',
    category: 'Bedsheets',
    price: 79.99,
    originalPrice: 99.99,
    image: 'https://images.unsplash.com/photo-1631049035463-7c2b5c3e4e18?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1631049035463-7c2b5c3e4e18?w=500&h=500&fit=crop'
    ],
    rating: 4.6,
    reviewCount: 112,
    stock: 38,
    description: 'Hypoallergenic down alternative comforter with box stitching to prevent shifting. Machine washable. All-season warmth.',
    colors: ['White'],
    sizes: ['Twin', 'Full', 'Queen', 'King'],
    tags: ['comforter', 'bedding', 'duvet', 'warm', 'hypoallergenic', 'bed', 'blanket', 'soft'],
    reviews: []
  },
  {
    id: 10,
    name: 'Contour Memory Foam Pillow',
    category: 'Pillows',
    price: 52.99,
    image: 'https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=500&h=500&fit=crop',
    images: [
      'https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=500&h=500&fit=crop'
    ],
    rating: 4.7,
    reviewCount: 88,
    stock: 54,
    description: 'Cervical contour pillow designed by chiropractors. Ideal for side and back sleepers. Relieves neck and shoulder pain.',
    badge: 'NEW ARRIVAL',
    colors: ['White'],
    sizes: ['Standard'],
    tags: ['pillow', 'contour', 'memory foam', 'foam', 'cervical', 'neck support', 'orthopedic', 'sleep', 'pain relief'],
    reviews: [
      {
        id: 6,
        userId: 6,
        userName: 'James Wilson',
        rating: 4,
        comment: 'Good pillow, took a few nights to get used to the shape.',
        date: '2025-09-25',
        approved: true
      }
    ]
  }
];
