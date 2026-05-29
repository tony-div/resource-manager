import { getPool } from '../../config/database';
import { hashPassword } from '../../utils/password';
import { normalizeArabic } from '../../utils/arabic-normalizer';

async function seed(): Promise<void> {
  const pool = getPool();

  const adminPassword = await hashPassword('admin123');
  const userPassword = await hashPassword('user123');

  await pool.execute(
    `INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE username = username`,
    ['admin', adminPassword, 'admin', 'System Admin']
  );

  await pool.execute(
    `INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE username = username`,
    ['user1', userPassword, 'borrower', 'John Doe']
  );

  await pool.execute(
    `INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE username = username`,
    ['user2', userPassword, 'borrower', 'Jane Smith']
  );

  await pool.execute(
    `INSERT INTO borrower_entities (name, description) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE name = name`,
    ['Engineering Department', 'Engineering and technical teams']
  );

  await pool.execute(
    `INSERT INTO borrower_entities (name, description) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE name = name`,
    ['Marketing Department', 'Marketing and communications']
  );

  await pool.execute(
    `INSERT INTO borrower_entities (name, description) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE name = name`,
    ['HR Department', 'Human resources and administration']
  );

  await pool.execute(
    'INSERT IGNORE INTO user_borrower_entity (user_id, entity_id) VALUES (2, 1)'
  );
  await pool.execute(
    'INSERT IGNORE INTO user_borrower_entity (user_id, entity_id) VALUES (2, 2)'
  );
  await pool.execute(
    'INSERT IGNORE INTO user_borrower_entity (user_id, entity_id) VALUES (3, 3)'
  );

  const items = [
    { name: 'Projector', qty: 10 },
    { name: 'Laptop Dell XPS 15', qty: 5 },
    { name: 'Wireless Microphone', qty: 8 },
    { name: 'Conference Speaker', qty: 3 },
    { name: 'Whiteboard Markers', qty: 20 },
    { name: 'Extension Cord', qty: 15 },
    { name: 'HDMI Cable', qty: 25 },
    { name: 'Tripod Stand', qty: 4 },
    { name: 'Camera', qty: 6 },
    { name: 'Tablet', qty: 10 },
  ];

  for (const item of items) {
    const normalized = normalizeArabic(item.name);
    await pool.execute(
      `INSERT INTO inventory_items (name, search_normalized, description, total_quantity)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = name`,
      [item.name, normalized, `Description for ${item.name}`, item.qty]
    );
  }

  const packages = [
    { name: 'Conference Kit', items: [{ inventory_id: 1, qty: 1 }, { inventory_id: 3, qty: 2 }, { inventory_id: 4, qty: 1 }] },
    { name: 'Presentation Kit', items: [{ inventory_id: 2, qty: 1 }, { inventory_id: 7, qty: 1 }, { inventory_id: 5, qty: 1 }] },
    { name: 'Photography Kit', items: [{ inventory_id: 9, qty: 1 }, { inventory_id: 8, qty: 1 }, { inventory_id: 7, qty: 1 }] },
  ];

  for (const pkg of packages) {
    const pkgNormalized = normalizeArabic(pkg.name);
    const [result] = await pool.execute<any>(
      `INSERT INTO packages (name, search_normalized, description) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = name`,
      [pkg.name, pkgNormalized, `Description for ${pkg.name}`]
    );
    const pkgId = result.insertId || 1;

    for (const item of pkg.items) {
      await pool.execute(
        `INSERT IGNORE INTO package_items (package_id, item_id, quantity) VALUES (?, ?, ?)`,
        [pkgId, item.inventory_id, item.qty]
      );
    }
  }

  await pool.execute(
    'INSERT INTO app_config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    ['company_name', JSON.stringify({ value: 'Resource Manager Inc' })]
  );
  await pool.execute(
    'INSERT INTO app_config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    ['default_reservation_days', JSON.stringify({ value: 3 })]
  );
  await pool.execute(
    'INSERT INTO app_config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
    ['timezone', JSON.stringify({ value: 'Asia/Riyadh' })]
  );

  console.log('Seed data inserted successfully.');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
