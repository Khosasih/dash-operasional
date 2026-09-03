import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

export function excelStoragePlugin(): Plugin {
  const uploadsDir = path.resolve(process.cwd(), 'uploads')
  const manifestPath = path.join(uploadsDir, 'manifest.json')

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }

  function getManifest(): Record<string, { period: string; originalName: string; uploadedAt: string }> {
    try {
      if (fs.existsSync(manifestPath)) {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      }
    } catch (e) {
      console.warn('Could not read manifest.json', e)
    }
    return {}
  }

  function saveManifest(manifest: Record<string, { period: string; originalName: string; uploadedAt: string }>) {
    try {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')
    } catch (e) {
      console.warn('Could not save manifest.json', e)
    }
  }

  // Copy sample excel file to uploads if it exists and hasn't been copied
  const sampleSource = path.resolve(process.cwd(), 'src/components/IT_Dashboard_Data.xlsx')
  const sampleTarget = path.resolve(uploadsDir, 'IT_Dashboard_Data.xlsx')
  if (fs.existsSync(sampleSource) && !fs.existsSync(sampleTarget)) {
    try {
      fs.copyFileSync(sampleSource, sampleTarget)
      const manifest = getManifest()
      manifest['IT_Dashboard_Data.xlsx'] = {
        period: 'Juli 2026',
        originalName: 'IT_Dashboard_Data.xlsx',
        uploadedAt: 'Data Bawaan Proyek',
      }
      saveManifest(manifest)
      console.log('✅ Initialized uploads/IT_Dashboard_Data.xlsx in project folder.')
    } catch (e) {
      console.warn('Could not copy initial sample excel file to uploads:', e)
    }
  }

  return {
    name: 'vite-plugin-excel-storage',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const parsedUrl = new URL(req.url || '', `http://${req.headers.host}`)
        const pathname = parsedUrl.pathname

        // 1. Upload File & Save to project's uploads/ folder
        if (pathname === '/api/upload-excel' && req.method === 'POST') {
          try {
            const rawFileName =
              (req.headers['x-file-name'] as string) || `upload_${Date.now()}.xlsx`
            const rawPeriodName = (req.headers['x-period-name'] as string) || ''
            
            const originalFileName = decodeURIComponent(rawFileName)
            const targetPeriod = rawPeriodName ? decodeURIComponent(rawPeriodName).trim() : ''

            // Generate descriptive safe filename incorporating period if given
            let safeFileName = path.basename(originalFileName)
            if (targetPeriod) {
              const sanitizedPeriod = targetPeriod.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
              const ext = path.extname(originalFileName) || '.xlsx'
              const nameWithoutExt = path.basename(originalFileName, ext)
              if (!nameWithoutExt.includes(sanitizedPeriod)) {
                safeFileName = `${nameWithoutExt}_${sanitizedPeriod}${ext}`
              }
            }

            const targetFilePath = path.join(uploadsDir, safeFileName)

            const chunks: Buffer[] = []
            req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
            req.on('end', () => {
              const buffer = Buffer.concat(chunks)
              fs.writeFileSync(targetFilePath, buffer)

              const nowStr = new Date().toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })

              const manifest = getManifest()
              manifest[safeFileName] = {
                period: targetPeriod || 'Juli 2026',
                originalName: originalFileName,
                uploadedAt: nowStr,
              }
              saveManifest(manifest)

              console.log(
                `📁 File physically saved: uploads/${safeFileName} (${buffer.length} bytes) for Period: "${targetPeriod || 'Auto'}"`,
              )

              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 200
              res.end(
                JSON.stringify({
                  success: true,
                  fileName: safeFileName,
                  filePath: `uploads/${safeFileName}`,
                  period: targetPeriod,
                  size: buffer.length,
                  uploadedAt: nowStr,
                }),
              )
            })
            return
          } catch (err: unknown) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }))
            return
          }
        }

        // 2. Get list and binary content of files physically present in uploads/
        if (pathname === '/api/load-all-excel-files-data' && req.method === 'GET') {
          try {
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true })
            }
            const manifest = getManifest()
            const files = fs
              .readdirSync(uploadsDir)
              .filter((f) => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'))
            
            const fileList = files.map((fileName) => {
              const fullPath = path.join(uploadsDir, fileName)
              const stats = fs.statSync(fullPath)
              const buffer = fs.readFileSync(fullPath)
              const meta = manifest[fileName]

              return {
                fileName,
                period: meta?.period,
                originalName: meta?.originalName || fileName,
                filePath: `uploads/${fileName}`,
                size: stats.size,
                fileSize: `${(stats.size / 1024).toFixed(1)} KB`,
                modifiedAt: meta?.uploadedAt || stats.mtime.toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
                base64: buffer.toString('base64'),
              }
            })

            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ success: true, files: fileList }))
            return
          } catch (err: unknown) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }))
            return
          }
        }


        // 3. Get list of files physically present in uploads/
        if (pathname === '/api/uploaded-files' && req.method === 'GET') {
          try {
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true })
            }
            const files = fs
              .readdirSync(uploadsDir)
              .filter((f) => f.endsWith('.xlsx') || f.endsWith('.xls') || f.endsWith('.csv'))
            const fileList = files.map((fileName) => {
              const fullPath = path.join(uploadsDir, fileName)
              const stats = fs.statSync(fullPath)
              return {
                fileName,
                filePath: `uploads/${fileName}`,
                size: stats.size,
                fileSize: `${(stats.size / 1024).toFixed(1)} KB`,
                modifiedAt: stats.mtime.toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
              }
            })

            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ success: true, files: fileList }))
            return
          } catch (err: unknown) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }))
            return
          }
        }


        // 3. Delete physical file from uploads/
        if (pathname === '/api/delete-file' && req.method === 'DELETE') {
          try {
            const fileName = parsedUrl.searchParams.get('fileName')
            if (!fileName) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing fileName param' }))
              return
            }
            const safeFileName = path.basename(fileName)
            const targetFilePath = path.join(uploadsDir, safeFileName)
            if (fs.existsSync(targetFilePath)) {
              fs.unlinkSync(targetFilePath)
              console.log(`🗑️ File physically removed from project: uploads/${safeFileName}`)
            }
            const manifest = getManifest()
            delete manifest[safeFileName]
            saveManifest(manifest)
            res.setHeader('Content-Type', 'application/json')
            res.statusCode = 200
            res.end(JSON.stringify({ success: true, message: `File ${safeFileName} deleted` }))
            return

          } catch (err: unknown) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Server error' }))
            return
          }
        }

        // 4. Download physical file from uploads/
        if (pathname === '/api/download-file' && req.method === 'GET') {
          try {
            const fileName = parsedUrl.searchParams.get('fileName')
            if (!fileName) {
              res.statusCode = 400
              res.end('Missing fileName')
              return
            }
            const safeFileName = path.basename(fileName)
            const targetFilePath = path.join(uploadsDir, safeFileName)
            if (!fs.existsSync(targetFilePath)) {
              res.statusCode = 404
              res.end('File not found')
              return
            }
            const fileStream = fs.createReadStream(targetFilePath)
            res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`)
            res.setHeader(
              'Content-Type',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            fileStream.pipe(res)
            return
          } catch {
            res.statusCode = 500
            res.end('Download error')
            return
          }
        }

        next()
      })
    },
  }
}
