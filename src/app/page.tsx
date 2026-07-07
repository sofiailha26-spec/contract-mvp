'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Contract = {
  id: string
  name: string
  status: string
  token: string
  createdAt: string
}

type Lang = 'zh' | 'en' | 'pt'

const T = {
  zh: {
    title: '我的合同',
    desc: '管理您的所有 PDF 合同',
    uploadBtn: '上传新合同',
    noContracts: '暂无合同记录',
    uploadFirst: '上传第一份合同',
    colName: '合同名称',
    colStatus: '状态',
    colDate: '创建日期',
    status_pending_creator: '等待达人签名',
    status_pending_admin: '等待我签名',
    status_completed: '已完成',
    status_unknown: '未知状态',
    action_copy: '复制达人链接',
    action_sign: '检查并签名',
    action_view: '查看归档',
    copySuccess: '链接已复制！请发给达人。',
    filterAll: '全部',
    filterPendingCreator: '缺达人签名',
    filterPendingAdmin: '缺我签名',
    filterCompleted: '已完成'
  },
  en: {
    title: 'My Contracts',
    desc: 'Manage all your PDF contracts',
    uploadBtn: 'Upload New Contract',
    noContracts: 'No contracts found',
    uploadFirst: 'Upload your first contract',
    colName: 'Contract Name',
    colStatus: 'Status',
    colDate: 'Date Created',
    status_pending_creator: 'Pending Creator Sign',
    status_pending_admin: 'Pending My Sign',
    status_completed: 'Completed',
    status_unknown: 'Unknown',
    action_copy: 'Copy Creator Link',
    action_sign: 'Review & Sign',
    action_view: 'View Completed',
    copySuccess: 'Link copied! Send it to the creator.',
    filterAll: 'All',
    filterPendingCreator: 'Missing Creator Sign',
    filterPendingAdmin: 'Missing My Sign',
    filterCompleted: 'Completed'
  },
  pt: {
    title: 'Meus Contratos',
    desc: 'Gerencie todos os seus contratos PDF',
    uploadBtn: 'Enviar Novo Contrato',
    noContracts: 'Nenhum contrato encontrado',
    uploadFirst: 'Envie seu primeiro contrato',
    colName: 'Nome do Contrato',
    colStatus: 'Status',
    colDate: 'Data de Criação',
    status_pending_creator: 'Aguardando Assinatura do Criador',
    status_pending_admin: 'Aguardando Minha Assinatura',
    status_completed: 'Concluído',
    status_unknown: 'Desconhecido',
    action_copy: 'Copiar Link do Criador',
    action_sign: 'Revisar e Assinar',
    action_view: 'Ver Concluído',
    copySuccess: 'Link copiado! Envie para o criador.',
    filterAll: 'Todos',
    filterPendingCreator: 'Falta Ass. Criador',
    filterPendingAdmin: 'Falta Minha Ass.',
    filterCompleted: 'Concluídos'
  }
}

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<Lang>('zh')
  const [filter, setFilter] = useState<'all' | 'pending_creator' | 'pending_admin' | 'completed'>('all')

  const t = T[lang]

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/upload')
      if (res.ok) {
        const data = await res.json()
        setContracts(data)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusText = (status: string) => {
    switch(status) {
      case 'pending_creator': return t.status_pending_creator
      case 'pending_admin': return t.status_pending_admin
      case 'completed': return t.status_completed
      default: return t.status_unknown
    }
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending_creator': return 'bg-yellow-50 text-yellow-700 ring-yellow-600/20'
      case 'pending_admin': return 'bg-blue-50 text-blue-700 ring-blue-600/20'
      case 'completed': return 'bg-green-50 text-green-700 ring-green-600/20'
      default: return 'bg-gray-50 text-gray-600 ring-gray-500/10'
    }
  }

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/sign/${token}`
    navigator.clipboard.writeText(link)
    alert(t.copySuccess)
  }

  const filteredContracts = contracts.filter(c => {
    if (filter === 'all') return true
    return c.status === filter
  })

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      
      {/* Header & Language Switcher */}
      <div className="flex justify-end mb-4 space-x-2">
        <button onClick={() => setLang('zh')} className={`px-3 py-1 text-sm rounded ${lang === 'zh' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}>中文</button>
        <button onClick={() => setLang('en')} className={`px-3 py-1 text-sm rounded ${lang === 'en' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}>English</button>
        <button onClick={() => setLang('pt')} className={`px-3 py-1 text-sm rounded ${lang === 'pt' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}>Português</button>
      </div>

      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold leading-7 text-gray-900">{t.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{t.desc}</p>
        </div>
        <div className="mt-4 sm:ml-4 sm:mt-0">
          <Link
            href="/contracts/upload"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            {t.uploadBtn}
          </Link>
        </div>
      </div>

      {/* Tabs for Filtering */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setFilter('all')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${filter === 'all' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            {t.filterAll}
          </button>
          <button
            onClick={() => setFilter('pending_creator')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${filter === 'pending_creator' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            {t.filterPendingCreator}
          </button>
          <button
            onClick={() => setFilter('pending_admin')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${filter === 'pending_admin' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            {t.filterPendingAdmin}
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${filter === 'completed' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
          >
            {t.filterCompleted}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filteredContracts.length === 0 ? (
        <div className="text-center bg-white rounded-lg border border-dashed border-gray-300 py-12">
          <p className="text-sm text-gray-500 mb-4">{t.noContracts}</p>
          {filter === 'all' && (
            <Link
              href="/contracts/upload"
              className="inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              {t.uploadFirst}
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">{t.colName}</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t.colStatus}</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">{t.colDate}</th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContracts.map((contract) => (
                <tr key={contract.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {contract.name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getStatusColor(contract.status)}`}>
                      {getStatusText(contract.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {new Date(contract.createdAt).toLocaleDateString()}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-4">
                    {contract.status === 'pending_creator' && (
                      <button onClick={() => copyLink(contract.token)} className="text-indigo-600 hover:text-indigo-900">
                        {t.action_copy}
                      </button>
                    )}
                    {contract.status === 'pending_admin' && (
                      <Link href={`/contracts/${contract.id}`} className="text-blue-600 hover:text-blue-900 font-bold">
                        {t.action_sign}
                      </Link>
                    )}
                    {contract.status === 'completed' && (
                      <Link href={`/contracts/${contract.id}`} className="text-green-600 hover:text-green-900">
                        {t.action_view}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
