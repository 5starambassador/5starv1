import { redirect } from 'next/navigation'

export default async function RedirectPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params

    if (!code) {
        redirect('/')
    }

    // Redirect to the referral form with the encrypted code
    redirect(`/refer?ref=${code}`)
}
