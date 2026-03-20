import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'save-config-plugin',
      configureServer(server) {
        server.middlewares.use('/api/save-config', (req, res, next) => {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk.toString() })
            req.on('end', () => {
              try {
                const configPath = path.resolve(__dirname, 'ai-orb-config.json')
                const parsed = JSON.parse(body) // Validate JSON
                fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf-8')
                
                res.setHeader('Content-Type', 'application/json')
                res.statusCode = 200
                res.end(JSON.stringify({ success: true }))
              } catch (e) {
                res.statusCode = 500
                res.end(JSON.stringify({ error: e.message }))
              }
            })
          } else {
            next()
          }
        })
      }
    }
  ],
})
