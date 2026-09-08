import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900'
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900'
})

export const metadata: Metadata = {
  title: 'GeoFeedback Agent v3.0',
  description:
    '将微信截图沉淀为可追溯反馈档案的产品经理工作台',
  icons: {
    icon: '/imgs/convex_icon.svg'
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} `}>
        <div className="bg-gray-200 text-stone-900">
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
