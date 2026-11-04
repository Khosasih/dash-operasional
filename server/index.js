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

// Endpoint Server SLA & Server Health (Grafana API)
app.get('/api/server-sla', async (req, res) => {
  try {
    const period = req.query.period || dayjs().format('YYYY-MM') // contoh: '2026-10'
    const from = dayjs(`${period}-01`).startOf('month').format('YYYY-MM-DDTHH:mm:ss[Z]')
    const to = dayjs(`${period}-01`).endOf('month').format('YYYY-MM-DDTHH:mm:ss[Z]')

    const grafanaUrl = process.env.GRAFANA_URL || 'https://zbx.uaj.my.id/grafana/api/ds/query'
    const grafanaToken =
      process.env.GRAFANA_TOKEN || 'glsa_yGT5yCWQIY7IJVNHC7Q5hDel23hFAwrA_de492d1f'
    const datasourceUid = process.env.GRAFANA_DATASOURCE_UID || 'eg0one0g7arcwc'

    const rawSql = `SELECT ROUND(AVG(device_uptime), 2) AS uptime
FROM (
  SELECT
 dev.hostname AS device,
 100 - (
100 * COALESCE(
 SUM(
 GREATEST(
0,
LEAST(
 COALESCE(o.up_again, $__unixEpochTo()),
 $__unixEpochTo()
) - GREATEST(
 o.going_down,
 $__unixEpochFrom()
)
)
),
0
) / ($__unixEpochTo() - $__unixEpochFrom())
) AS device_uptime
  FROM devices dev
  LEFT JOIN device_outages o
 ON o.device_id = dev.device_id
 AND o.going_down < $__unixEpochTo()
 AND COALESCE(o.up_again, $__unixEpochTo()) > $__unixEpochFrom()
  WHERE dev.hostname IN ('10.10.11.11','10.10.11.12','10.10.11.13','10.10.11.14','10.10.11.15','10.10.11.16','10.10.11.17','10.10.10.57','10.10.10.58','10.10.10.59','10.10.10.60','10.10.10.176','10.10.10.178','10.10.10.179','10.13.10.121','10.13.10.122','10.13.10.123','10.11.10.137','10.11.10.139','10.11.10.140')
  GROUP BY dev.device_id, dev.hostname
) AS uptime_per_device;`

    const payload = {
      from,
      to,
      queries: [
        {
          refId: 'A',
          datasource: {
            uid: datasourceUid,
          },
          rawSql,
          format: 'table',
          intervalMs: 3600000,
          maxDataPoints: 1000,
        },
      ],
    }

    const response = await axios.post(grafanaUrl, payload, {
      headers: {
        Authorization: `Bearer ${grafanaToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    })

    const values = response.data?.results?.A?.frames?.[0]?.data?.values
    let uptime = null
    if (Array.isArray(values) && Array.isArray(values[0]) && values[0][0] != null) {
      uptime = Number(values[0][0])
    }

    res.json({
      period,
      from,
      to,
      uptime,
      data: {
        values: values || [],
      },
    })
  } catch (error) {
    console.error('Error fetching Server SLA from Grafana:', error.message)
    res
      .status(500)
      .json({ error: 'Failed to fetch Server SLA from Grafana', details: error.message })
  }
})

// Endpoint SLA Application (Webhook: http://10.10.10.204:5678/webhook/sla_application?month={{month}}&year={{year}})
app.get(['/api/application-sla', '/api/sla-application'], async (req, res) => {
  try {
    let { month, year, period } = req.query

    if (!month || !year) {
      const p = period || dayjs().format('YYYY-MM') // e.g. 2026-10
      const d = dayjs(`${p}-01`)
      year = d.format('YYYY')
      month = String(d.month() + 1) // 1, 2, ..., 12 (tanpa leading zero)
    } else {
      month = String(parseInt(month, 10)) // pastikan tanpa leading zero: 1, 2, 3.. dst
    }

    const targetUrl = `http://10.10.10.204:5678/webhook/sla_application?month=${month}&year=${year}`
    console.log(`[SLA APPLICATION] Fetching from: ${targetUrl}`)

    const response = await axios.get(targetUrl, { timeout: 10000 })
    const data = response.data

    let sla = null
    if (data?.values && Array.isArray(data.values) && data.values[0] && data.values[0][0] != null) {
      sla = Number(Number(data.values[0][0]).toFixed(2))
    }

    res.json({
      month,
      year,
      sla,
      data,
    })
  } catch (error) {
    console.error('Error fetching SLA Application:', error.message)
    res.status(500).json({ error: 'Failed to fetch SLA Application', details: error.message })
  }
})

// Endpoint Security Services SLA (Webhook: http://10.10.10.204:5678/webhook/security_service?month=...&year=...)
app.get(['/api/security-service-sla', '/api/security-services-sla'], async (req, res) => {
  try {
    let { month, year, period } = req.query

    if (!month || !year) {
      const p = period || dayjs().format('YYYY-MM') // e.g. 2026-10
      const d = dayjs(`${p}-01`)
      year = d.format('YYYY')
      month = String(d.month() + 1) // 1, 2, ..., 12 (tanpa leading zero)
    } else {
      month = String(parseInt(month, 10)) // pastikan tanpa leading zero: 1, 2, 3.. dst
    }

    const targetUrl = `http://10.10.10.204:5678/webhook/security_service?month=${month}&year=${year}`
    console.log(`[SLA SECURITY SERVICES] Fetching from: ${targetUrl}`)

    const response = await axios.get(targetUrl, { timeout: 10000 })
    const data = response.data

    let sla = null
    if (data?.values && Array.isArray(data.values) && data.values[0] && data.values[0][0] != null) {
      sla = Number(Number(data.values[0][0]).toFixed(2))
    }

    res.json({
      month,
      year,
      sla,
      data,
    })
  } catch (error) {
    console.error('Error fetching SLA Security Services:', error.message)
    res.status(500).json({ error: 'Failed to fetch SLA Security Services', details: error.message })
  }
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
  const period = req.query.period || dayjs().format('YYYY-MM') // contoh: '2026-08'
  const start = dayjs(`${period}-01`).startOf('month').format('YYYY-MM-DD HH:mm:ss')
  const end = dayjs(`${period}-01`).endOf('month').format('YYYY-MM-DD HH:mm:ss')

  const query = `
WITH t AS (
  SELECT 'Semanggi' AS site, 35682 AS triggerid
  UNION ALL SELECT 'Pluit', 143444
  UNION ALL SELECT 'BSD', 36483
  UNION ALL SELECT 'Border', 67788
),
pre AS (
  SELECT site, clock, ns, eventid, value
  FROM (
    SELECT t.site, e.clock, e.ns, e.eventid, e.value,
           ROW_NUMBER() OVER (PARTITION BY t.site ORDER BY e.clock DESC, e.ns DESC, e.eventid DESC) AS rn
    FROM t
    JOIN events e ON e.source = 0 AND e.object = 0 AND e.objectid = t.triggerid
    WHERE e.clock < UNIX_TIMESTAMP('${start}')
  ) z
  WHERE rn = 1
),
ev AS (
  SELECT site, clock, ns, eventid, value FROM pre
  UNION ALL
  SELECT t.site, e.clock, e.ns, e.eventid, e.value
  FROM t
  JOIN events e ON e.source = 0 AND e.object = 0 AND e.objectid = t.triggerid
  WHERE e.clock BETWEEN UNIX_TIMESTAMP('${start}') AND UNIX_TIMESTAMP('${end}')
),
seg AS (
  SELECT site, value,
         GREATEST(clock, UNIX_TIMESTAMP('${start}')) AS s,
         LEAST(COALESCE(LEAD(clock) OVER (PARTITION BY site ORDER BY clock, ns, eventid), UNIX_TIMESTAMP('${end}')), UNIX_TIMESTAMP('${end}')) AS e
  FROM ev
),
per_site AS (
  SELECT t.site,
         100 - LEAST(100, COALESCE(SUM(CASE WHEN seg.value = 1 AND seg.e > seg.s THEN seg.e - seg.s ELSE 0 END), 0)
                          / (UNIX_TIMESTAMP('${end}') - UNIX_TIMESTAMP('${start}')) * 100) AS sla
  FROM t
  LEFT JOIN seg ON seg.site = t.site
  GROUP BY t.site
)
SELECT ROUND(AVG(sla), 2) AS SLA
FROM per_site;
  `

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
              data: rows,
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
  const period = req.query.period || dayjs().format('YYYY-MM')
  const start = dayjs(`${period}-01`).startOf('month').format('YYYY-MM-DD HH:mm:ss')
  const nextMonthStart = dayjs(`${period}-01`)
    .add(1, 'month')
    .startOf('month')
    .format('YYYY-MM-DD HH:mm:ss')

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
  `

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
              data: rows,
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
    const period = req.query.period || dayjs().format('YYYY-MM')
    const location = req.query.location?.toLowerCase() || 'semanggi'
    const isYtd = req.query.ytd === 'true'

    // Jika YTD, startEpoch dimulai dari 1 Januari tahun yang sama
    const startEpoch = isYtd
      ? dayjs(`${period.substring(0, 4)}-01-01`)
          .startOf('month')
          .unix()
      : dayjs(`${period}-01`).startOf('month').unix()

    const endEpoch = dayjs(`${period}-01`).endOf('month').unix()

    let rrdPath = ''
    if (location === 'semanggi') {
      rrdPath = '/opt/librenms/rrd/10.10.0.2/port-id1430.rrd'
    } else if (location === 'pluit') {
      rrdPath = '/opt/librenms/rrd/10.5.0.1/port-id119072.rrd'
    } else if (location === 'bsd') {
      rrdPath = '/opt/librenms/rrd/10.13.3.2/port-id10913.rrd'
    } else {
      return res.status(400).json({ error: 'Unknown location' })
    }

    const url = `http://10.10.10.90:9000/?rrd_path=${rrdPath}&epoch_start_time=${startEpoch}&epoch_end_time=${endEpoch}`
    console.log(`[WAN UTILIZATION] Fetching from: ${url}`)

    const response = await axios.get(url)
    // Response dari LibreNMS berbentuk { meta: {...}, data: [...] }
    const data = response.data?.data

    if (!Array.isArray(data) || data.length === 0) {
      console.log(
        `[WAN UTILIZATION] No data array returned. Data:`,
        typeof data === 'object' ? JSON.stringify(data).substring(0, 100) : data,
      )
      return res.json({ avg: 0 })
    }
    console.log(`[WAN UTILIZATION] Data length: ${data.length}`)

    // Kalkulasi Average (contoh menggunakan inoctets, dikonversi ke persentase atau Mbps)
    // Asumsi: nilai inoctets adalah Bytes per second.
    // Kita hitung rata-rata inoctets dan outoctets, lalu ambil yang terbesar,
    // dan ubah menjadi persentase dengan asumsi kapasitas port 1 Gbps (1,000,000,000 bps)
    // Silakan sesuaikan ifSpeed (kapasitas port) di bawah ini jika berbeda (misal 100Mbps = 100,000,000)

    let totalIn = 0
    let totalOut = 0
    let maxIn = 0
    let maxOut = 0
    let count = 0

    data.forEach((row) => {
      if (row.inoctets != null && row.outoctets != null) {
        totalIn += row.inoctets
        totalOut += row.outoctets

        if (row.inoctets > maxIn) maxIn = row.inoctets
        if (row.outoctets > maxOut) maxOut = row.outoctets

        count++
      }
    })

    if (count === 0) return res.json({ avg: 0, peak: 0 })

    const avgInBps = totalIn / count
    const avgOutBps = totalOut / count

    // Tentukan kecepatan port berdasarkan lokasi
    // Semanggi = 1.2 Gbps (1,200,000,000 bps)
    // Pluit = 1 Gbps (1,000,000,000 bps)
    // BSD = 800 Mbps (800,000,000 bps)
    let PORT_SPEED_BPS = 1000000000
    if (location === 'semanggi') PORT_SPEED_BPS = 1200000000
    else if (location === 'pluit') PORT_SPEED_BPS = 1000000000
    else if (location === 'bsd') PORT_SPEED_BPS = 800000000

    // Sesuai request, AVG dihitung menggunakan rumus khusus:
    // (mean(inoctets) + mean(outoctets)) * 8 / PORT_SPEED_BPS * 100
    let utilizationPercent = (((avgInBps + avgOutBps) * 8) / PORT_SPEED_BPS) * 100

    // Sesuai request, Peak dihitung menggunakan rumus khusus:
    // (max(inoctets) + max(outoctets)) * 8 / PORT_SPEED_BPS * 100
    let peakPercent = (((maxIn + maxOut) * 8) / PORT_SPEED_BPS) * 100

    // Untuk response (jika dibutuhkan)
    const avgInBits = avgInBps * 8
    const avgOutBits = avgOutBps * 8

    // Bulatkan ke 2 desimal
    utilizationPercent = Math.round(utilizationPercent * 100) / 100
    peakPercent = Math.round(peakPercent * 100) / 100

    res.json({
      period,
      startEpoch,
      endEpoch,
      avg: utilizationPercent,
      peak: peakPercent,
      avgInMbps: (avgInBits / 1000000).toFixed(2),
      avgOutMbps: (avgOutBits / 1000000).toFixed(2),
    })
  } catch (error) {
    console.error('Error fetching WAN utilization:', error.message)
    res.status(500).json({ error: 'Failed to fetch WAN utilization' })
  }
})

// Endpoint CPU Utilization
app.get(['/api/cpu-utilization', '/api/cpu', '/cpu'], async (req, res) => {
  try {
    let { from, to, period, location } = req.query

    // Jika from & to belum dispesifikasi, hitung epoch ms awal s/d akhir bulan berdasarkan period (YYYY-MM)
    if (!from || !to) {
      const p = period || dayjs().format('YYYY-MM')
      from = dayjs(`${p}-01`).startOf('month').valueOf()
      to = dayjs(`${p}-01`).endOf('month').valueOf()
    }

    const targetUrl = `http://10.10.10.64:8088/cpu?from=${from}&to=${to}`
    console.log(`[CPU UTILIZATION] Fetching from: ${targetUrl}`)

    const response = await axios.get(targetUrl, { timeout: 10000 })
    const data = response.data

    // Jika request menyertakan filter lokasi spesifik
    if (location && Array.isArray(data)) {
      const loc = location.toLowerCase()
      const matched = data.find(
        (d) =>
          (d.lokasi || '').toLowerCase().includes(loc) ||
          loc.includes((d.lokasi || '').toLowerCase()),
      )
      return res.json(matched || { lokasi: location, cpu_avg: 0, cpu_peak: 0 })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching CPU utilization:', error.message)
    res.status(500).json({ error: 'Failed to fetch CPU utilization', details: error.message })
  }
})

// Endpoint RAM / Memory Utilization
app.get(['/api/ram-utilization', '/api/memory-utilization'], (req, res) => {
  const period = req.query.period || dayjs().format('YYYY-MM') // contoh: '2026-10'
  const start = dayjs(`${period}-01`).startOf('month').format('YYYY-MM-DD HH:mm:ss')
  const end = dayjs(`${period}-01`).endOf('month').format('YYYY-MM-DD HH:mm:ss')

  const query = `
SELECT
  lokasi AS Lokasi,
  total AS \`Total RAM\`,
  total - used AS \`Available RAM\`,
  used AS \`Used\`,
  used / total AS \`Usage\`,
  avg_used / total AS \`Average\`,
  max_used / total AS \`Max\`
FROM
  (
    SELECT
      CASE
        WHEN k LIKE 'scp.semanggi.ram.%' THEN 'Semanggi'
        WHEN k LIKE 'scp.bsd.ram.%' THEN 'BSD'
        WHEN k LIKE 'vmware.cluster.memory.%' THEN 'Pluit'
      END AS lokasi,
      MAX(
        CASE
          WHEN k IN (
            'scp.semanggi.ram.total',
            'scp.bsd.ram.total',
            'vmware.cluster.memory.total'
          ) THEN v
        END
      ) AS total,
      MAX(
        CASE
          WHEN k IN (
            'scp.semanggi.ram.used',
            'scp.bsd.ram.used',
            'vmware.cluster.memory.used'
          ) THEN v
        END
      ) AS used,
      MAX(
        CASE
          WHEN k IN (
            'scp.semanggi.ram.used',
            'scp.bsd.ram.used',
            'vmware.cluster.memory.used'
          ) THEN avg_v
        END
      ) AS avg_used,
      MAX(
        CASE
          WHEN k IN (
            'scp.semanggi.ram.used',
            'scp.bsd.ram.used',
            'vmware.cluster.memory.used'
          ) THEN max_v
        END
      ) AS max_used
    FROM
      (
        SELECT
          i.key_ AS k,
          (
            SELECT
              h.value
            FROM
              history h
            WHERE
              h.itemid = i.itemid
            ORDER BY
              h.clock DESC
            LIMIT
              1
          ) AS v,
          (
            SELECT
              AVG(h.value)
            FROM
              history h
            WHERE
              h.itemid = i.itemid
              AND h.clock BETWEEN UNIX_TIMESTAMP('${start}')
              AND UNIX_TIMESTAMP('${end}')
          ) AS avg_v,
          (
            SELECT
              MAX(h.value)
            FROM
              history h
            WHERE
              h.itemid = i.itemid
              AND h.clock BETWEEN UNIX_TIMESTAMP('${start}')
              AND UNIX_TIMESTAMP('${end}')
          ) AS max_v
        FROM
          items i
        WHERE
          i.status = 0
          AND i.key_ IN (
            'scp.semanggi.ram.total',
            'scp.semanggi.ram.used',
            'scp.bsd.ram.total',
            'scp.bsd.ram.used',
            'vmware.cluster.memory.total',
            'vmware.cluster.memory.used'
          )
      ) x
    GROUP BY
      lokasi
  ) t
ORDER BY
  FIELD(lokasi, 'Semanggi', 'BSD', 'Pluit');
  `

  const fallbackGrafana = async () => {
    try {
      const grafanaUrl = process.env.GRAFANA_URL || 'https://zbx.uaj.my.id/grafana/api/ds/query'
      const grafanaToken =
        process.env.GRAFANA_TOKEN || 'glsa_yGT5yCWQIY7IJVNHC7Q5hDel23hFAwrA_de492d1f'
      const datasourceUid = process.env.GRAFANA_ZABBIX_MYSQL_UID || 'eftontc84z3eoc'

      const fromMs = dayjs(`${period}-01`).startOf('month').valueOf()
      const toMs = dayjs(`${period}-01`).endOf('month').valueOf()

      const rawSql = query
        .replace(`UNIX_TIMESTAMP('${start}')`, '$__unixEpochFrom()')
        .replace(`UNIX_TIMESTAMP('${end}')`, '$__unixEpochTo()')

      const payload = {
        from: String(fromMs),
        to: String(toMs),
        queries: [
          {
            refId: 'A',
            datasource: { uid: datasourceUid },
            rawSql,
            format: 'table',
          },
        ],
      }

      const response = await axios.post(grafanaUrl, payload, {
        headers: {
          Authorization: `Bearer ${grafanaToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      })

      const values = response.data?.results?.A?.frames?.[0]?.data?.values
      if (Array.isArray(values) && values[0]) {
        const locations = values[0]
        const formatted = locations.map((loc, idx) => ({
          lokasi: loc,
          totalRam: values[1]?.[idx] || 0,
          availableRam: values[2]?.[idx] || 0,
          used: values[3]?.[idx] || 0,
          usage: values[4]?.[idx] != null ? Number(values[4][idx]) : 0,
          average: values[5]?.[idx] != null ? Number(values[5][idx]) : 0,
          max: values[6]?.[idx] != null ? Number(values[6][idx]) : 0,
          avgPercent:
            values[5]?.[idx] != null ? Number((Number(values[5][idx]) * 100).toFixed(2)) : 0,
          peakPercent:
            values[6]?.[idx] != null ? Number((Number(values[6][idx]) * 100).toFixed(2)) : 0,
        }))
        return res.json({ period, startDate: start, endDate: end, data: formatted })
      }
      return res.json({ period, startDate: start, endDate: end, data: [] })
    } catch (gErr) {
      console.error('Grafana RAM fallback failed:', gErr.message)
      return res
        .status(500)
        .json({ error: 'Failed to fetch RAM utilization', details: gErr.message })
    }
  }

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
            console.warn('SSH Forwarding Error, attempting Grafana fallback:', err.message)
            sshClient.end()
            return fallbackGrafana()
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

            const formatted = rows.map((r) => ({
              lokasi: r.Lokasi,
              totalRam: r['Total RAM'],
              availableRam: r['Available RAM'],
              used: r['Used'],
              usage: r['Usage'] != null ? Number(r['Usage']) : 0,
              average: r['Average'] != null ? Number(r['Average']) : 0,
              max: r['Max'] != null ? Number(r['Max']) : 0,
              avgPercent:
                r['Average'] != null ? Number((Number(r['Average']) * 100).toFixed(2)) : 0,
              peakPercent: r['Max'] != null ? Number((Number(r['Max']) * 100).toFixed(2)) : 0,
            }))

            res.json({
              period,
              startDate: start,
              endDate: end,
              data: formatted,
            })
          } catch (dbErr) {
            sshClient.end()
            console.warn('Database Error, attempting Grafana fallback:', dbErr.message)
            return fallbackGrafana()
          }
        },
      )
    })
    .on('error', (err) => {
      console.warn('SSH Connection Error, attempting Grafana fallback:', err.message)
      fallbackGrafana()
    })
    .connect({
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT || '22'),
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD,
    })
})

// Endpoint Storage Utilization (Semanggi, BSD, Pluit)
app.get(['/api/storage-utilization', '/api/storage-usage'], (req, res) => {
  const period = req.query.period || dayjs().format('YYYY-MM') // contoh: '2026-10'
  const start = dayjs(`${period}-01`).startOf('month').format('YYYY-MM-DD HH:mm:ss')
  const end = dayjs(`${period}-01`).endOf('month').format('YYYY-MM-DD HH:mm:ss')

  const query = `
SELECT
  r.Lokasi,
  ROUND(r.total / r.d, 2) AS 'Total (TB)',
  ROUND(r.avail / r.d, 2) AS 'Available (TB)',
  ROUND(r.used  / r.d, 2) AS 'Used (TB)',
  ROUND(r.pct, 2)         AS 'Usage (%)'
FROM (
  SELECT
    CASE
      WHEN x.key_ LIKE 'scp.semanggi.%' THEN 'Semanggi'
      WHEN x.key_ LIKE 'scp.bsd.%'      THEN 'BSD'
      WHEN x.key_ LIKE 'vxrail.pluit.%' THEN 'Pluit'
    END AS Lokasi,
    CASE WHEN x.key_ LIKE 'vxrail.pluit.%' THEN POW(1024,4) ELSE POW(1000,4) END AS d,
    MAX(CASE WHEN x.key_ LIKE '%.storage.total'     THEN x.value END) AS total,
    MAX(CASE WHEN x.key_ LIKE '%.storage.available' THEN x.value END) AS avail,
    MAX(CASE WHEN x.key_ LIKE '%.storage.used'      THEN x.value END) AS used,
    MAX(CASE WHEN x.key_ LIKE '%.storage.usage'     THEN x.value END) AS pct
  FROM (
    SELECT i.key_, h.value
    FROM items i
    JOIN history h ON h.itemid = i.itemid
    WHERE i.key_ IN (
      'scp.semanggi.storage.total','scp.semanggi.storage.available','scp.semanggi.storage.used','scp.semanggi.storage.usage',
      'scp.bsd.storage.total','scp.bsd.storage.available','scp.bsd.storage.used','scp.bsd.storage.usage',
      'vxrail.pluit.storage.total','vxrail.pluit.storage.available','vxrail.pluit.storage.used','vxrail.pluit.storage.usage'
    )
    AND h.clock BETWEEN UNIX_TIMESTAMP('${start}') AND UNIX_TIMESTAMP('${end}')
    AND h.clock = (SELECT MAX(h2.clock) FROM history h2
                   WHERE h2.itemid = i.itemid
                   AND h2.clock BETWEEN UNIX_TIMESTAMP('${start}') AND UNIX_TIMESTAMP('${end}'))

    UNION ALL

    SELECT i.key_, h.value
    FROM items i
    JOIN history_uint h ON h.itemid = i.itemid
    WHERE i.key_ IN (
      'scp.semanggi.storage.total','scp.semanggi.storage.available','scp.semanggi.storage.used','scp.semanggi.storage.usage',
      'scp.bsd.storage.total','scp.bsd.storage.available','scp.bsd.storage.used','scp.bsd.storage.usage',
      'vxrail.pluit.storage.total','vxrail.pluit.storage.available','vxrail.pluit.storage.used','vxrail.pluit.storage.usage'
    )
    AND h.clock BETWEEN UNIX_TIMESTAMP('${start}') AND UNIX_TIMESTAMP('${end}')
    AND h.clock = (SELECT MAX(h2.clock) FROM history_uint h2
                   WHERE h2.itemid = i.itemid
                   AND h2.clock BETWEEN UNIX_TIMESTAMP('${start}') AND UNIX_TIMESTAMP('${end}'))
  ) x
  GROUP BY Lokasi, d
) r
ORDER BY FIELD(r.Lokasi, 'Semanggi', 'BSD', 'Pluit');
  `

  const fallbackGrafana = async () => {
    try {
      const grafanaUrl = process.env.GRAFANA_URL || 'https://zbx.uaj.my.id/grafana/api/ds/query'
      const grafanaToken =
        process.env.GRAFANA_TOKEN || 'glsa_yGT5yCWQIY7IJVNHC7Q5hDel23hFAwrA_de492d1f'
      const datasourceUid = process.env.GRAFANA_ZABBIX_MYSQL_UID || 'eftontc84z3eoc'

      const fromMs = dayjs(`${period}-01`).startOf('month').valueOf()
      const toMs = dayjs(`${period}-01`).endOf('month').valueOf()

      const rawSql = query
        .replace(new RegExp(`UNIX_TIMESTAMP\\('${start}'\\)`, 'g'), '$__unixEpochFrom()')
        .replace(new RegExp(`UNIX_TIMESTAMP\\('${end}'\\)`, 'g'), '$__unixEpochTo()')

      const payload = {
        from: String(fromMs),
        to: String(toMs),
        queries: [
          {
            refId: 'A',
            datasource: { uid: datasourceUid },
            rawSql,
            format: 'table',
          },
        ],
      }

      const response = await axios.post(grafanaUrl, payload, {
        headers: {
          Authorization: `Bearer ${grafanaToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      })

      const values = response.data?.results?.A?.frames?.[0]?.data?.values
      if (Array.isArray(values) && values[0]) {
        const locations = values[0]
        const formatted = locations.map((loc, idx) => {
          const rawUsage = values[4]?.[idx]
          const usagePct =
            rawUsage != null
              ? Number(Number(rawUsage).toFixed(2))
              : values[1]?.[idx] && values[3]?.[idx]
                ? Number(((Number(values[3][idx]) / Number(values[1][idx])) * 100).toFixed(2))
                : 0
          return {
            lokasi: loc,
            totalTb: values[1]?.[idx] != null ? Number(Number(values[1][idx]).toFixed(2)) : 0,
            availableTb: values[2]?.[idx] != null ? Number(Number(values[2][idx]).toFixed(2)) : 0,
            usedTb: values[3]?.[idx] != null ? Number(Number(values[3][idx]).toFixed(2)) : 0,
            usage: usagePct,
            storageUsed: usagePct,
          }
        })
        return res.json({ period, startDate: start, endDate: end, data: formatted })
      }
      return res.json({ period, startDate: start, endDate: end, data: [] })
    } catch (gErr) {
      console.error('Grafana Storage fallback failed:', gErr.message)
      return res
        .status(500)
        .json({ error: 'Failed to fetch Storage utilization', details: gErr.message })
    }
  }

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
            console.warn('SSH Forwarding Error, attempting Grafana fallback:', err.message)
            sshClient.end()
            return fallbackGrafana()
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

            const formatted = rows.map((r) => {
              const usagePct =
                r['Usage (%)'] != null
                  ? Number(Number(r['Usage (%)']).toFixed(2))
                  : r['Total (TB)'] && r['Used (TB)']
                    ? Number(((Number(r['Used (TB)']) / Number(r['Total (TB)'])) * 100).toFixed(2))
                    : 0
              return {
                lokasi: r.Lokasi,
                totalTb: r['Total (TB)'] != null ? Number(Number(r['Total (TB)']).toFixed(2)) : 0,
                availableTb:
                  r['Available (TB)'] != null ? Number(Number(r['Available (TB)']).toFixed(2)) : 0,
                usedTb: r['Used (TB)'] != null ? Number(Number(r['Used (TB)']).toFixed(2)) : 0,
                usage: usagePct,
                storageUsed: usagePct,
              }
            })

            res.json({
              period,
              startDate: start,
              endDate: end,
              data: formatted,
            })
          } catch (dbErr) {
            sshClient.end()
            console.warn('Database Error, attempting Grafana fallback:', dbErr.message)
            return fallbackGrafana()
          }
        },
      )
    })
    .on('error', (err) => {
      console.warn('SSH Connection Error, attempting Grafana fallback:', err.message)
      fallbackGrafana()
    })
    .connect({
      host: process.env.SSH_HOST,
      port: parseInt(process.env.SSH_PORT || '22'),
      username: process.env.SSH_USER,
      password: process.env.SSH_PASSWORD,
    })
})

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
