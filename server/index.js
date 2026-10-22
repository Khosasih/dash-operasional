import express from 'express'
import cors from 'cors'
import { Client } from 'ssh2'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import dayjs from 'dayjs'
import axios from 'axios'



dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

// Contoh Endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is running successfully!' })
})

// Template Endpoint untuk Connect DB via SSH (Bisa disesuaikan nanti)
app.get('/api/data', (req, res) => {
  const sshClient = new Client()
  sshClient
    .on('ready', () => {
      sshClient.forwardOut(
        '127.0.0.1',
        12345,
        process.env.DB_HOST,
        parseInt(process.env.DB_PORT || '3306'),
        async (err, stream) => {
          if (err) {
            return res.status(500).json({ error: 'SSH Forwarding Error', details: err.message })
          }
          try {
            const db = await mysql.createConnection({
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              database: process.env.DB_NAME,
              stream: stream,
            })
            const [rows] = await db.execute('SELECT 1 + 1 AS solution')
            db.end()
            sshClient.end()
            res.json({ data: rows })
          } catch (dbErr) {
            sshClient.end()
            res.status(500).json({ error: 'Database Error', details: dbErr.message })
          }
        },
      )
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'SSH Connection Error', details: err.message })
    })
    .connect({
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT || '22'),
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD, // Atau gunakan privateKey
      // privateKey: fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH)
    })
})

// Endpoint SLA Network Dinamis
app.get('/api/sla-network', (req, res) => {
  const period = req.query.period || dayjs().format('YYYY-MM'); // contoh: '2026-08'
  const start = dayjs(`${period}-01`).startOf('month').format('YYYY-MM-DD HH:mm:ss');
  const end = dayjs(`${period}-01`).endOf('month').format('YYYY-MM-DD HH:mm:ss');

  const query = `
SELECT
    ROUND(
        (
            Semanggi +
            Pluit +
            BSD +
            Border
        ) / 4,
        2
    ) AS SLA
FROM
(
    SELECT
        ROUND(
            100 - LEAST(
                100,
                COALESCE(
                    SUM(
                        CASE
                            WHEN value = 1 AND end_clock > start_clock
                            THEN end_clock - start_clock
                            ELSE 0
                        END
                    ),
                    0
                )
                / (
                    UNIX_TIMESTAMP('${end}')
                    - UNIX_TIMESTAMP('${start}')
                )
                * 100
            ),
            2
        ) AS Semanggi
    FROM (
        SELECT
            value,
            GREATEST(
                clock,
                UNIX_TIMESTAMP('${start}')
            ) AS start_clock,
            LEAST(
                COALESCE(
                    LEAD(clock) OVER (ORDER BY clock),
                    UNIX_TIMESTAMP('${end}')
                ),
                UNIX_TIMESTAMP('${end}')
            ) AS end_clock
        FROM (
            (
                SELECT clock, value
                FROM events
                WHERE source = 0
                  AND object = 0
                  AND objectid = 35682
                  AND clock < UNIX_TIMESTAMP('${start}')
                ORDER BY clock DESC
                LIMIT 1
            )
            UNION ALL
            (
                SELECT clock, value
                FROM events
                WHERE source = 0
                  AND object = 0
                  AND objectid = 35682
                  AND clock BETWEEN
                      UNIX_TIMESTAMP('${start}')
                      AND
                      UNIX_TIMESTAMP('${end}')
            )
        ) e
    ) e2
) A

CROSS JOIN

(
    SELECT
        ROUND(
            100 - LEAST(
                100,
                COALESCE(
                    SUM(
                        CASE
                            WHEN value = 1 AND end_clock > start_clock
                            THEN end_clock - start_clock
                            ELSE 0
                        END
                    ),
                    0
                )
                / (
                    UNIX_TIMESTAMP('${end}')
                    - UNIX_TIMESTAMP('${start}')
                )
                * 100
            ),
            2
        ) AS Pluit
    FROM (
        SELECT
            value,
            GREATEST(
                clock,
                UNIX_TIMESTAMP('${start}')
            ) AS start_clock,
            LEAST(
                COALESCE(
                    LEAD(clock) OVER (ORDER BY clock),
                    UNIX_TIMESTAMP('${end}')
                ),
                UNIX_TIMESTAMP('${end}')
            ) AS end_clock
        FROM (
            (
                SELECT clock, value
                FROM events
                WHERE source = 0
                  AND object = 0
                  AND objectid = 70993
                  AND clock < UNIX_TIMESTAMP('${start}')
                ORDER BY clock DESC
                LIMIT 1
            )
            UNION ALL
            (
                SELECT clock, value
                FROM events
                WHERE source = 0
                  AND object = 0
                  AND objectid = 70993
                  AND clock BETWEEN
                      UNIX_TIMESTAMP('${start}')
                      AND
                      UNIX_TIMESTAMP('${end}')
            )
        ) e
    ) e2
) B

CROSS JOIN

(
    SELECT
        ROUND(
            100 - LEAST(
                100,
                COALESCE(
                    SUM(
                        CASE
                            WHEN value = 1 AND end_clock > start_clock
                            THEN end_clock - start_clock
                            ELSE 0
                        END
                    ),
                    0
                )
                / (
                    UNIX_TIMESTAMP('${end}')
                    - UNIX_TIMESTAMP('${start}')
                )
                * 100
            ),
            2
        ) AS BSD
    FROM (
        SELECT
            value,
            GREATEST(
                clock,
                UNIX_TIMESTAMP('${start}')
            ) AS start_clock,
            LEAST(
                COALESCE(
                    LEAD(clock) OVER (ORDER BY clock),
                    UNIX_TIMESTAMP('${end}')
                ),
                UNIX_TIMESTAMP('${end}')
            ) AS end_clock
        FROM (
            (
                SELECT clock, value
                FROM events
                WHERE source = 0
                  AND object = 0
                  AND objectid = 36483
                  AND clock < UNIX_TIMESTAMP('${start}')
                ORDER BY clock DESC
                LIMIT 1
            )
            UNION ALL
            (
                SELECT clock, value
                FROM events
                WHERE source = 0
                  AND object = 0
                  AND objectid = 36483
                  AND clock BETWEEN
                      UNIX_TIMESTAMP('${start}')
                      AND
                      UNIX_TIMESTAMP('${end}')
            )
        ) e
    ) e2
) C

CROSS JOIN

(
    SELECT
        ROUND(
            100 - LEAST(
                100,
                COALESCE(
                    SUM(
                        CASE
                            WHEN value = 1 AND end_clock > start_clock
                            THEN end_clock - start_clock
                            ELSE 0
                        END
                    ),
                    0
                )
                / (
                    UNIX_TIMESTAMP('${end}')
                    - UNIX_TIMESTAMP('${start}')
                )
                * 100
            ),
            2
        ) AS Border
    FROM (
        SELECT
            value,
            GREATEST(
                clock,
                UNIX_TIMESTAMP('${start}')
            ) AS start_clock,
            LEAST(
                COALESCE(
                    LEAD(clock) OVER (ORDER BY clock),
                    UNIX_TIMESTAMP('${end}')
                ),
                UNIX_TIMESTAMP('${end}')
            ) AS end_clock
        FROM (
            (
                SELECT clock, value
                FROM events
                WHERE source = 0
                  AND object = 0
                  AND objectid = 67788
                  AND clock < UNIX_TIMESTAMP('${start}')
                ORDER BY clock DESC
                LIMIT 1
            )
            UNION ALL
            (
                SELECT clock, value
                FROM events
                WHERE source = 0
                  AND object = 0
                  AND objectid = 67788
                  AND clock BETWEEN
                      UNIX_TIMESTAMP('${start}')
                      AND
                      UNIX_TIMESTAMP('${end}')
            )
        ) e
    ) e2
) D;
  `;

  const sshClient = new Client()
  sshClient
    .on('ready', () => {
      sshClient.forwardOut(
        '127.0.0.1',
        12345,
        process.env.DB_HOST,
        parseInt(process.env.DB_PORT || '3306'),
        async (err, stream) => {
          if (err) {
            return res.status(500).json({ error: 'SSH Forwarding Error', details: err.message })
          }
          try {
            const db = await mysql.createConnection({
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              database: process.env.DB_NAME,
              stream: stream,
            })
            const [rows] = await db.execute(query)
            db.end()
            sshClient.end()
            res.json({
              period: period,
              startDate: start,
              endDate: end,
              data: rows
            })
          } catch (dbErr) {
            sshClient.end()
            res.status(500).json({ error: 'Database Error', details: dbErr.message })
          }
        },
      )
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'SSH Connection Error', details: err.message })
    })
    .connect({
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT || '22'),
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD, // Atau gunakan privateKey
    })
})

// Endpoint Infra Health Dinamis
app.get('/api/infra-health', (req, res) => {
  const period = req.query.period || dayjs().format('YYYY-MM');
  const start = dayjs(`${period}-01`).startOf('month').format('YYYY-MM-DD HH:mm:ss');
  const nextMonthStart = dayjs(`${period}-01`).add(1, 'month').startOf('month').format('YYYY-MM-DD HH:mm:ss');

  const query = `
SELECT
    ROUND(
        (
            1 -
            SUM(COALESCE(d.downtime, 0))
            /
            (
                4 *
                (
                    UNIX_TIMESTAMP('${nextMonthStart}')
                    - UNIX_TIMESTAMP('${start}')
                )
            )
        ) * 100,
        2
    ) AS Health
FROM (
    SELECT 35853 AS triggerid
    UNION ALL SELECT 36315
    UNION ALL SELECT 67904
    UNION ALL SELECT 71034
) t
LEFT JOIN (
    SELECT
        triggerid,
        SUM(
            GREATEST(
                LEAST(
                    COALESCE(
                        end_time,
                        UNIX_TIMESTAMP('${nextMonthStart}')
                    ),
                    UNIX_TIMESTAMP('${nextMonthStart}')
                )
                -
                GREATEST(
                    clock,
                    UNIX_TIMESTAMP('${start}')
                ),
                0
            )
        ) AS downtime
    FROM (
        SELECT
            objectid AS triggerid,
            clock,
            value,
            LEAD(clock) OVER (
                PARTITION BY objectid
                ORDER BY clock
            ) AS end_time
        FROM events
        WHERE source = 0
          AND object = 0
          AND objectid IN (35853, 36315, 67904, 71034)
          AND clock < UNIX_TIMESTAMP('${nextMonthStart}')
    ) e
    WHERE value = 1
      AND (
          end_time IS NULL
          OR end_time > UNIX_TIMESTAMP('${start}')
      )
    GROUP BY triggerid
) d
    ON d.triggerid = t.triggerid;
  `;

  const sshClient = new Client()
  sshClient
    .on('ready', () => {
      sshClient.forwardOut(
        '127.0.0.1',
        12345,
        process.env.DB_HOST,
        parseInt(process.env.DB_PORT || '3306'),
        async (err, stream) => {
          if (err) {
            return res.status(500).json({ error: 'SSH Forwarding Error', details: err.message })
          }
          try {
            const db = await mysql.createConnection({
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              database: process.env.DB_NAME,
              stream: stream,
            })
            const [rows] = await db.execute(query)
            db.end()
            sshClient.end()
            res.json({
              period: period,
              startDate: start,
              nextMonthStartDate: nextMonthStart,
              data: rows
            })
          } catch (dbErr) {
            sshClient.end()
            res.status(500).json({ error: 'Database Error', details: dbErr.message })
          }
        },
      )
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'SSH Connection Error', details: err.message })
    })
    .connect({
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT || '22'),
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD,
    })
})

// Endpoint WAN Utilization
app.get('/api/wan-utilization', async (req, res) => {
  try {
    const period = req.query.period || dayjs().format('YYYY-MM');
    const location = req.query.location?.toLowerCase() || 'semanggi';
    const isYtd = req.query.ytd === 'true';
    
    // Jika YTD, startEpoch dimulai dari 1 Januari tahun yang sama
    const startEpoch = isYtd 
      ? dayjs(`${period.substring(0, 4)}-01-01`).startOf('month').unix()
      : dayjs(`${period}-01`).startOf('month').unix();
      
    const endEpoch = dayjs(`${period}-01`).endOf('month').unix();

    let rrdPath = '';
    if (location === 'semanggi') {
      rrdPath = '/opt/librenms/rrd/10.10.0.2/port-id1430.rrd';
    } else if (location === 'pluit') {
      rrdPath = '/opt/librenms/rrd/10.5.0.1/port-id119072.rrd';
    } else if (location === 'bsd') {
      rrdPath = '/opt/librenms/rrd/10.13.3.2/port-id10913.rrd';
    } else {
      return res.status(400).json({ error: 'Unknown location' });
    }

    const url = `http://10.10.10.90:9000/?rrd_path=${rrdPath}&epoch_start_time=${startEpoch}&epoch_end_time=${endEpoch}`;
    console.log(`[WAN UTILIZATION] Fetching from: ${url}`);
    
    const response = await axios.get(url);
    // Response dari LibreNMS berbentuk { meta: {...}, data: [...] }
    const data = response.data?.data;
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[WAN UTILIZATION] No data array returned. Data:`, typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : data);
      return res.json({ avg: 0 });
    }
    console.log(`[WAN UTILIZATION] Data length: ${data.length}`);

    // Kalkulasi Average (contoh menggunakan inoctets, dikonversi ke persentase atau Mbps)
    // Asumsi: nilai inoctets adalah Bytes per second.
    // Kita hitung rata-rata inoctets dan outoctets, lalu ambil yang terbesar, 
    // dan ubah menjadi persentase dengan asumsi kapasitas port 1 Gbps (1,000,000,000 bps)
    // Silakan sesuaikan ifSpeed (kapasitas port) di bawah ini jika berbeda (misal 100Mbps = 100,000,000)
    
    let totalIn = 0;
    let totalOut = 0;
    let maxIn = 0;
    let maxOut = 0;
    let count = 0;

    data.forEach(row => {
      if (row.inoctets != null && row.outoctets != null) {
        totalIn += row.inoctets;
        totalOut += row.outoctets;
        
        if (row.inoctets > maxIn) maxIn = row.inoctets;
        if (row.outoctets > maxOut) maxOut = row.outoctets;
        
        count++;
      }
    });

    if (count === 0) return res.json({ avg: 0, peak: 0 });

    const avgInBps = totalIn / count;
    const avgOutBps = totalOut / count;
    
    // Tentukan kecepatan port berdasarkan lokasi
    // Semanggi = 1.2 Gbps (1,200,000,000 bps)
    // Pluit = 1 Gbps (1,000,000,000 bps)
    // BSD = 800 Mbps (800,000,000 bps)
    let PORT_SPEED_BPS = 1000000000;
    if (location === 'semanggi') PORT_SPEED_BPS = 1200000000;
    else if (location === 'pluit') PORT_SPEED_BPS = 1000000000;
    else if (location === 'bsd') PORT_SPEED_BPS = 800000000;
    
    // Sesuai request, AVG dihitung menggunakan rumus khusus:
    // (mean(inoctets) + mean(outoctets)) * 8 / PORT_SPEED_BPS * 100
    let utilizationPercent = ((avgInBps + avgOutBps) * 8 / PORT_SPEED_BPS) * 100;
    
    // Sesuai request, Peak dihitung menggunakan rumus khusus:
    // (max(inoctets) + max(outoctets)) * 8 / PORT_SPEED_BPS * 100
    let peakPercent = ((maxIn + maxOut) * 8 / PORT_SPEED_BPS) * 100;

    // Untuk response (jika dibutuhkan)
    const avgInBits = avgInBps * 8;
    const avgOutBits = avgOutBps * 8;

    // Bulatkan ke 2 desimal
    utilizationPercent = Math.round(utilizationPercent * 100) / 100;
    peakPercent = Math.round(peakPercent * 100) / 100;

    res.json({
      period,
      startEpoch,
      endEpoch,
      avg: utilizationPercent,
      peak: peakPercent,
      avgInMbps: (avgInBits / 1000000).toFixed(2),
      avgOutMbps: (avgOutBits / 1000000).toFixed(2)
    });

  } catch (error) {
    console.error('Error fetching WAN utilization:', error.message);
    res.status(500).json({ error: 'Failed to fetch WAN utilization' });
  }
})

// Endpoint CPU Utilization
app.get(['/api/cpu-utilization', '/api/cpu', '/cpu'], async (req, res) => {
  try {
    let { from, to, period, location } = req.query;

    // Jika from & to belum dispesifikasi, hitung epoch ms awal s/d akhir bulan berdasarkan period (YYYY-MM)
    if (!from || !to) {
      const p = period || dayjs().format('YYYY-MM');
      from = dayjs(`${p}-01`).startOf('month').valueOf();
      to = dayjs(`${p}-01`).endOf('month').valueOf();
    }

    const targetUrl = `http://10.10.10.64:8088/cpu?from=${from}&to=${to}`;
    console.log(`[CPU UTILIZATION] Fetching from: ${targetUrl}`);

    const response = await axios.get(targetUrl, { timeout: 10000 });
    const data = response.data;

    // Jika request menyertakan filter lokasi spesifik
    if (location && Array.isArray(data)) {
      const loc = location.toLowerCase();
      const matched = data.find((d) =>
        (d.lokasi || '').toLowerCase().includes(loc) || loc.includes((d.lokasi || '').toLowerCase())
      );
      return res.json(matched || { lokasi: location, cpu_avg: 0, cpu_peak: 0 });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching CPU utilization:', error.message);
    res.status(500).json({ error: 'Failed to fetch CPU utilization', details: error.message });
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
