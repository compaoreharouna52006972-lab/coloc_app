'use client'

import { Calendar, Pencil, Receipt } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from '@/lib/router'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { useInvoices } from '@/hooks/useInvoices'
import { useAuth } from '@/contexts/AuthContext'
import { useApartment } from '@/contexts/ApartmentContext'
import { useToast } from '@/contexts/ToastContext'
import { formatMoney, formatDate } from '@/utils/format'
import { errorMessage } from '@/utils/errors'
import { CategoryIcon, CATEGORY_ICON } from '@/components/icons'

export default function InvoicesPage() {
  const { user } = useAuth()
  const { member } = useApartment()
  const canManage = (createdBy: string) =>
    createdBy === user?.id || member?.role === 'admin' || member?.role === 'manager'
  const { toast } = useToast()
  const { invoices, loading, deleteInvoice } = useInvoices()
  const [category, setCategory] = useState('all')

  const filtered = useMemo(
    () => (category === 'all' ? invoices : invoices.filter((i) => i.category === category)),
    [invoices, category]
  )

  const monthTotal = useMemo(() => {
    const now = new Date()
    return invoices
      .filter((i) => {
        const d = new Date(i.created_at)
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      })
      .reduce((sum, i) => sum + Number(i.amount), 0)
  }, [invoices])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Supprimer la facture "${title}" ? Les dettes liées seront annulées.`)) return
    try {
      await deleteInvoice(id)
      toast('Facture supprimée', 'success')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  async function openReceipt(path: string) {
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 120)
    if (error || !data) {
      toast('Reçu introuvable', 'error')
      return
    }
    if (!window.open(data.signedUrl, '_blank', 'noopener')) window.location.assign(data.signedUrl)
  }

  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="page-title">Toutes les factures</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
            Ce mois : <strong className="money">{formatMoney(monthTotal)}</strong>
          </p>
        </div>
        <Link to="/factures/nouvelle" className="btn btn-primary" style={{ padding: '10px 14px', textDecoration: 'none', fontSize: 12.5 }}>
          + Ajouter
        </Link>
      </div>

      <select
        aria-label="Filtrer par catégorie"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--border)', borderRadius: 10, marginBottom: 14, background: '#fff', fontSize: 13 }}
      >
        <option value="all">Toutes les catégories</option>
        {Object.keys(CATEGORY_ICON).map((key) => (
          <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
        ))}
      </select>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune facture pour l'instant.</div>
      ) : (
        filtered.map((inv) => (
          <div key={inv.id} className="card" style={{ marginBottom: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-bg)', display: 'grid', placeItems: 'center', fontSize: 16 }}>
                  <CategoryIcon category={inv.category} size={17} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{inv.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Avancée par {inv.creator?.full_name || 'Inconnu'}</div>
                </div>
              </div>
              <div className="money" style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{formatMoney(inv.amount)}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                <Calendar size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{inv.due_date ? formatDate(inv.due_date) : "Pas d'échéance"}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {inv.receipt_path && (
                  <button onClick={() => openReceipt(inv.receipt_path!)} style={{ background: 'var(--primary-bg)', color: 'var(--primary)', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    <Receipt size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Reçu
                  </button>
                )}
                {canManage(inv.created_by) && (
                  <>
                    <Link to={`/factures/${inv.id}/modifier`} style={{ background: 'var(--track)', color: 'var(--text)', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                      <Pencil size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />Modifier
                    </Link>
                    <button onClick={() => handleDelete(inv.id, inv.title)} style={{ background: 'var(--danger-bg)', color: 'var(--danger-text)', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </Layout>
  )
}
