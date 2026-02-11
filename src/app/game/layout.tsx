import { getSession } from '@/lib/auth/dal'
import { SocketProvider } from '@/lib/socket/provider'

export default async function GameLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  return (
    <SocketProvider userId={session.userId}>
      {children}
    </SocketProvider>
  )
}
