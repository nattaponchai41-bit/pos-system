import { withAuth } from 'next-auth/middleware'

export default withAuth({
  callbacks: {
    authorized({ token }) {
      return token?.isActive === true
    },
  },
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/((?!api/auth|api/install|install|_next/static|_next/image|favicon.ico|public|uploads).*)',
  ],
}
