'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Mail, Link as LinkIcon, Copy, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInvite } from '@/lib/actions/admin'
import { toast } from 'sonner'

export function InviteDialog() {
  const t = useTranslations('admin')
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [customStartingBalance, setCustomStartingBalance] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [emailPending, setEmailPending] = useState(false)
  const [linkPending, setLinkPending] = useState(false)

  const handleSendEmail = async () => {
    setEmailPending(true)
    const formData = new FormData()
    formData.append('email', email)
    formData.append('sendEmail', 'true')
    formData.append('origin', window.location.origin)
    if (customStartingBalance) {
      formData.append('customStartingBalance', customStartingBalance)
    }

    const result = await createInvite(undefined, formData)

    setEmailPending(false)

    if (result?.success) {
      toast.success(t('inviteSent'))
      setEmail('')
      setCustomStartingBalance('')
      setOpen(false)
    } else if (result?.error) {
      toast.error(result.error)
    }
  }

  const handleGenerateLink = async () => {
    setLinkPending(true)
    const formData = new FormData()
    formData.append('email', email)
    formData.append('sendEmail', 'false')
    formData.append('origin', window.location.origin)
    if (customStartingBalance) {
      formData.append('customStartingBalance', customStartingBalance)
    }

    const result = await createInvite(undefined, formData)

    setLinkPending(false)

    if (result?.success && result.link) {
      setGeneratedLink(result.link)
      toast.success('Link generiert')
    } else if (result?.error) {
      toast.error(result.error)
    }
  }

  const handleCopyLink = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      toast.success(t('inviteCopied'))
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setEmail('')
    setCustomStartingBalance('')
    setGeneratedLink('')
    setCopied(false)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (value) {
        setOpen(true)
      } else {
        handleClose()
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Mail className="h-4 w-4 mr-2" />
          {t('inviteUser')}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>{t('inviteUser')}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Sende eine Einladung per E-Mail oder generiere einen teilbaren Link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">
              E-Mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="customStartingBalance" className="text-zinc-300">
              Individuelles Startguthaben (optional)
            </Label>
            <Input
              id="customStartingBalance"
              type="number"
              placeholder="Standard: 1000"
              value={customStartingBalance}
              onChange={(e) => setCustomStartingBalance(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              min="0"
              step="1"
            />
            <p className="text-xs text-zinc-500">
              Leer lassen für Standard-Startguthaben
            </p>
          </div>

          {generatedLink ? (
            <div className="space-y-2">
              <Label className="text-zinc-300">Einladungslink</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={generatedLink}
                  className="bg-zinc-800 border-zinc-700 text-white flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="border-zinc-700 hover:bg-zinc-800"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSendEmail}
                disabled={!email || emailPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Mail className="h-4 w-4 mr-2" />
                {emailPending ? 'Sendet...' : t('sendEmail')}
              </Button>
              <Button
                onClick={handleGenerateLink}
                disabled={!email || linkPending}
                variant="outline"
                className="flex-1 border-zinc-700 hover:bg-zinc-800"
              >
                <LinkIcon className="h-4 w-4 mr-2" />
                {linkPending ? 'Generiert...' : t('generateLink')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
