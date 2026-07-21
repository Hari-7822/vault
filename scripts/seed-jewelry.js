import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Category from '../models/Category.js';
import Product from '../models/Product.js';

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const categories = [
    { name: 'Engagement Rings', slug: 'engagement-rings', icon: '💍', description: 'Solitaire, halo, and eternity bands' },
    { name: 'Rings', slug: 'rings', icon: '💎', description: 'Fashion and statement rings' },
    { name: 'Pendants', slug: 'pendants', icon: '📿', description: 'Drop pendants, solitaires, and clusters' },
    { name: 'Earrings', slug: 'earrings', icon: '✨', description: 'Studs, drops, and chandeliers' },
    { name: 'Bangles', slug: 'bangles', icon: '⭕', description: 'Solid bangles, cuffs, and tennis bracelets' },
    { name: 'Necklaces', slug: 'necklaces', icon: '📿', description: 'Chains and statement necklaces' },
    { name: 'Bracelets', slug: 'bracelets', icon: '🔗', description: 'Chains, cuffs, and tennis bracelets' },
  ];

  for (const cat of categories) {
    await Category.findOneAndUpdate({ slug: cat.slug }, cat, { upsert: true, new: true });
  }
  console.log('✅ Categories seeded');

  const products = [
    {
      title: 'Brillante Solitaire',
      subtitle: 'Round Brilliant Cut',
      category: 'Engagement Rings',
      description: 'Classic six-prong solitaire with a stunning round brilliant diamond.',
      price: 49,
      specs: ['Approx 4.8g', '18K Compatible', 'STL+3DM'],
      badge: 'Popular',
      emoji: '💍',
      wireSymbol: '◇',
      fileFormats: ['STL', '3DM', 'OBJ'],
      licenseType: 'Commercial',
      estimatedWeight: '4.8g',
      shankDiameter: '17.35mm (US Size 7)',
      stoneSize: '6.5mm Round (1.0ct equiv.)',
      settingType: '4-Prong Cathedral',
      wallThickness: '0.8mm',
      compatibleMetals: ['Gold 9K–24K', 'Platinum', 'Silver'],
      isFeatured: true,
    },
    {
      title: 'Cascade Teardrop',
      subtitle: 'Multi-Stone Pavé',
      category: 'Pendants',
      description: 'Elegant teardrop pendant with pavé-set stones in a graduated cascade.',
      price: 34,
      specs: ['Approx 3.2g', 'Platinum Ready', 'OBJ+STL'],
      badge: 'New',
      emoji: '📿',
      wireSymbol: '△',
      fileFormats: ['STL', 'OBJ'],
      licenseType: 'Commercial',
      estimatedWeight: '3.2g',
      compatibleMetals: ['Gold', 'Platinum', 'Silver'],
      isFeatured: true,
    },
    {
      title: 'Astral Stud',
      subtitle: 'Princess Cut Bezel',
      category: 'Earrings',
      description: 'Modern princess-cut studs in a sleek bezel setting.',
      price: 28,
      specs: ['Approx 2.1g pair', 'Rose Gold', '3DM+STL'],
      emoji: '✦',
      wireSymbol: '✦',
      fileFormats: ['STL', '3DM'],
      licenseType: 'Commercial',
      estimatedWeight: '2.1g pair',
      settingType: 'Bezel',
      compatibleMetals: ['Rose Gold', 'White Gold', 'Platinum'],
    },
    {
      title: 'Eternal Knot',
      subtitle: 'Celtic Heritage Bangle',
      category: 'Bangles',
      description: 'Intricate Celtic knotwork bangle with heritage-inspired detailing.',
      price: 65,
      specs: ['Approx 18g', 'Sterling Silver', 'STL Only'],
      badge: 'Exclusive',
      emoji: '⭕',
      wireSymbol: '○',
      fileFormats: ['STL'],
      licenseType: 'Commercial',
      estimatedWeight: '18g',
      compatibleMetals: ['Sterling Silver', 'Gold', 'Platinum'],
    },
    {
      title: 'Halo Eternity',
      subtitle: 'Full Pavé Setting',
      category: 'Rings',
      description: 'A dazzling halo ring with full pavé diamond accents around the band.',
      price: 79,
      specs: ['Approx 6.4g', '18K White Gold', '3DM+STL'],
      badge: 'Popular',
      emoji: '💎',
      wireSymbol: '◇',
      fileFormats: ['STL', '3DM'],
      licenseType: 'Commercial',
      estimatedWeight: '6.4g',
      stoneSize: '5.0mm Center (0.75ct)',
      settingType: 'Pavé',
      wallThickness: '0.9mm',
      compatibleMetals: ['White Gold', 'Platinum', 'Rose Gold'],
      isFeatured: true,
    },
    {
      title: 'Botanical Leaf',
      subtitle: 'Organic Nature Series',
      category: 'Pendants',
      description: 'Inspired by the delicate veins of a tropical leaf, this pendant captures the beauty of nature.',
      price: 42,
      specs: ['Approx 2.8g', 'Any Metal', 'OBJ+ZPR'],
      badge: 'New',
      emoji: '🌿',
      wireSymbol: '⬡',
      fileFormats: ['STL', 'OBJ', 'ZPR'],
      licenseType: 'Commercial',
      estimatedWeight: '2.8g',
      compatibleMetals: ['Gold', 'Silver', 'Platinum'],
    },
    {
      title: 'Twisted Infinity',
      subtitle: 'Split Shank Band',
      category: 'Rings',
      description: 'A contemporary twist on the classic band with a split shank design.',
      price: 55,
      specs: ['Approx 5.2g', 'Rose Gold', 'STL+3DM'],
      emoji: '♾️',
      wireSymbol: '∞',
      fileFormats: ['STL', '3DM'],
      licenseType: 'Commercial',
      estimatedWeight: '5.2g',
      shankDiameter: 'US Size 7-9',
      compatibleMetals: ['Rose Gold', 'Yellow Gold', 'Platinum'],
    },
    {
      title: 'Chandelier Cascade',
      subtitle: 'Multi-Drop Setting',
      category: 'Earrings',
      description: 'Dramatic chandelier earrings with cascading diamond drops.',
      price: 58,
      specs: ['Approx 4.4g pair', '22K Gold', '3DM Only'],
      badge: 'Exclusive',
      emoji: '✨',
      wireSymbol: '☆',
      fileFormats: ['STL', '3DM'],
      licenseType: 'Commercial',
      estimatedWeight: '4.4g pair',
      compatibleMetals: ['22K Gold', 'Platinum', 'White Gold'],
      isFeatured: true,
    },
    {
      title: 'Cathedral Solitaire',
      subtitle: 'Six-Prong Classic',
      category: 'Engagement Rings',
      description: 'Timeless cathedral setting with a classic six-prong solitaire.',
      price: 52,
      specs: ['Approx 5.1g', 'Any Gold Karat', 'STL+3DM'],
      emoji: '💍',
      wireSymbol: '◇',
      fileFormats: ['STL', '3DM', 'OBJ'],
      licenseType: 'Commercial',
      estimatedWeight: '5.1g',
      shankDiameter: 'US Size 6-8',
      stoneSize: '6.0mm Round (0.9ct)',
      settingType: '6-Prong Cathedral',
      wallThickness: '0.85mm',
      compatibleMetals: ['Any Gold Karat', 'Platinum'],
    },
  ];

  for (const prod of products) {
    await Product.findOneAndUpdate({ title: prod.title }, prod, { upsert: true, new: true });
  }
  console.log('✅ Products seeded');

  await mongoose.disconnect();
  console.log('✅ Migration complete');
};

seed().catch(console.error);