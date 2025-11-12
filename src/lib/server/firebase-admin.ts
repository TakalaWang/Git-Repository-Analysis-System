import * as admin from "firebase-admin"
import fs from "fs"
import path from "path"

if (!admin.apps.length) {
  const servicePath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!servicePath) throw new Error("Missing GOOGLE_APPLICATION_CREDENTIALS")

  const resolvedPath = fs.existsSync(servicePath)
    ? servicePath
    : path.resolve(process.cwd(), servicePath)

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Firebase service account file not found: ${resolvedPath}`)
  }

  const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"))

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

export const adminDb = admin.firestore()
export const adminAuth = admin.auth()
