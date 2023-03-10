import './globals.css';
import { UserProvider } from './UserContext';
import Navbar from '../components/Navbar';

import { Montserrat as Font } from 'next/font/google';

const font = Font({ subsets: ['latin'], weight: ['300', '500', '700', '800', '900'] });

export const metadata = {
  title: 'App',
  description: '',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${font.className} bg-mantis-200`}
      >
        <UserProvider>
          <Navbar/>
          <div className={`${font.className} h-4/5`}>
            {children}
          </div>
        </UserProvider>
      </body>
    </html>
  )
}
