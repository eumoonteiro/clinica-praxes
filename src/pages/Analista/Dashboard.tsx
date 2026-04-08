import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';

import { 
  LogOut,
  Users,
  TrendingUp,
  Plus,
  DollarSign,
  Settings,
  X
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.5.207/pdf.worker.min.js`;

const AnalistaDashboard = () => {
  const { userData } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  // Form states
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [filterPatientId, setFilterPatientId] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!userData) return;

    // Listen to ALL patients and filter locally for robustness with CPF/UID mix
    const unsubPatients = onSnapshot(collection(db, 'pacientes'), (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const myPatients = allData.filter((p: any) => 
        p.analistaUid === userData.uid || 
        (p.analistaCpf && p.analistaCpf.replace(/\D/g, '') === userData.cpf?.replace(/\D/g, ''))
      );
      setPatients(myPatients.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    });

    // Same for payments
    const unsubPayments = onSnapshot(collection(db, 'pagamentos'), (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const myPayments = allData.filter((p: any) => 
        p.analistaUid === userData.uid || 
        (p.analistaCpf && p.analistaCpf.replace(/\D/g, '') === userData.cpf?.replace(/\D/g, ''))
      );
      setPayments(myPayments.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    return () => {
      unsubPatients();
      unsubPayments();
    };
  }, [userData]);

  const updateRepasseStatus = async (paymentId: string, status: boolean) => {
    try {
      await updateDoc(doc(db, 'pagamentos', paymentId), {
        repasseConfirmado: status
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setLoadingProfile(true);
    try {
      await updateDoc(doc(db, 'usuarios_clinica', userData.uid), {
        name: editName,
        email: editEmail
      });
      // Also update auth profile if needed
      // await updateProfile(auth.currentUser!, { displayName: editName });
      alert('Perfil atualizado com sucesso! Recarregue para ver as mudanças.');
      setShowProfileModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setEditEmail(userData.email || '');
    }
  }, [userData, showProfileModal]);

  const filteredPayments = payments.filter(pay => {
    const payDate = pay.paymentDate || '';
    const matchesMonth = payDate.startsWith(`${filterYear}-${filterMonth}`);
    const matchesPatient = filterPatientId === '' || pay.patientId === filterPatientId;
    return matchesMonth && matchesPatient;
  });

  const currentMonthRepasse = payments?.filter(p => {
    const pDate = p.paymentDate || '';
    return pDate.startsWith(`${filterYear}-${filterMonth}`);
  }).reduce((acc, curr) => acc + curr.repasse, 0) || 0;

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '40px 0', position: 'relative' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 className="outfit">Olá, {userData?.name}</h1>
            <p style={{ color: 'var(--text-muted)' }}>Membro Analista • Práxis Clínica</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" style={{ background: '#f1f5f9', color: 'var(--primary)' }} onClick={() => setShowProfileModal(true)}>
              Meu Perfil <Settings size={18} />
            </button>
            <button className="btn" style={{ background: '#fee2e2', color: '#ef4444' }} onClick={() => auth.signOut()}>
              Sair <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'var(--accent-glow)', color: 'var(--secondary)', padding: '15px', borderRadius: '15px' }}><Users size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Meus Pacientes</span>
              <h3 className="outfit">{patients.filter(p => p.status === 'Ativo').length} Ativos</h3>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: '#dcfce7', color: '#16a34a', padding: '15px', borderRadius: '15px' }}><TrendingUp size={24}/></div>
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Repasse Práxis (Mês Atual)</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <select 
                    value={filterMonth} 
                    onChange={e => setFilterMonth(e.target.value)}
                    style={{ border: 'none', background: 'none', fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    value={filterYear} 
                    onChange={e => setFilterYear(e.target.value)}
                    style={{ border: 'none', background: 'none', fontSize: '0.8rem', color: 'var(--secondary)', fontWeight: 600, cursor: 'pointer', width: '55px' }}
                  />
                </div>
              </div>
              <h3 className="outfit">R$ {currentMonthRepasse.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h4 className="outfit" style={{ margin: 0 }}>Gestão de Atendimentos</h4>
            <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '0.9rem' }} onClick={() => {
              const name = prompt('Nome do Paciente?');
              if (name) {
                addDoc(collection(db, 'pacientes'), {
                  name,
                  analistaUid: userData.uid,
                  status: 'Ativo',
                  reasonStopped: '',
                  assignedAt: new Date().toISOString().split('T')[0],
                  createdAt: new Date(),
                  files: [],
                  evolucaoFrequencia: 'Semanal'
                }).then(() => alert('Paciente cadastrado!'));
              }
            }}>
              <Plus size={18}/> Novo Paciente
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Paciente</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Status</th>
                  <th style={{ padding: '15px', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '15px' }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                    </td>
                    <td style={{ padding: '15px' }}>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '4px 10px', 
                        borderRadius: '100px', 
                        background: p.status === 'Ativo' ? '#dcfce7' : '#fee2e2',
                        color: p.status === 'Ativo' ? '#16a34a' : '#ef4444',
                        fontWeight: 700
                      }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <a 
                          href={`/paciente/${p.id}`} 
                          className="btn" 
                          style={{ padding: '8px 15px', fontSize: '0.8rem', background: 'var(--secondary)', color: 'white' }}
                        >
                          Ver Detalhes
                        </a>
                        {p.files?.some((f: any) => f.name.toLowerCase().includes('ficha') || f.name.toLowerCase().includes('inscricao')) ? (
                          <a 
                            href={p.files.find((f: any) => f.name.toLowerCase().includes('ficha') || f.name.toLowerCase().includes('inscricao')).url} 
                            target="_blank"
                            className="btn" 
                            style={{ padding: '8px 15px', fontSize: '0.8rem', background: '#f1f5f9', color: 'var(--primary)' }}
                          >
                            PDF Ficha
                          </a>
                        ) : (
                          <button 
                            className="btn" 
                            disabled
                            style={{ padding: '8px 15px', fontSize: '0.8rem', background: '#f1f5f9', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                            title="Ficha de inscrição não encontrada"
                          >
                            Sem PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '25px', justifyContent: 'space-between' }}>
            <h4 className="outfit" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><DollarSign size={20}/> Histórico de Recebimentos</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select className="form-control" style={{ width: 'auto', padding: '6px 12px' }} value={filterPatientId} onChange={e => setFilterPatientId(e.target.value)}>
                <option value="">Todos os Pacientes</option>
                {Array.from(new Set(payments.map(p => p.patientId))).map(pid => (
                  <option key={pid} value={pid}>{payments.find(p => p.patientId === pid)?.patientName}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: '5px' }}>
                <select className="form-control" style={{ width: 'auto', padding: '6px 12px' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  className="form-control" 
                  style={{ width: '80px', padding: '6px 12px' }} 
                  value={filterYear} 
                  onChange={e => setFilterYear(e.target.value)} 
                />
              </div>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ padding: '12px' }}>Data</th>
                  <th style={{ padding: '12px' }}>Paciente</th>
                  <th style={{ padding: '12px' }}>Valor</th>
                  <th style={{ padding: '12px' }}>Repasse</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map(pay => (
                  <tr key={pay.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px' }}>{pay.paymentDate ? new Date(pay.paymentDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{pay.patientName}</td>
                    <td style={{ padding: '12px' }}>R$ {pay.value.toFixed(2)}</td>
                    <td style={{ padding: '12px', fontWeight: 700 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#ef4444' }}>- R$ {pay.repasse.toFixed(2)}</span>
                        <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: pay.repasseConfirmado ? '#16a34a' : '#ef4444' }}>
                          <input type="checkbox" checked={pay.repasseConfirmado} onChange={e => updateRepasseStatus(pay.id, e.target.checked)} />
                          {pay.repasseConfirmado ? 'Repasse OK' : 'Pendente'}
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum registro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button 
              onClick={() => setShowProfileModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
            <h3 className="outfit" style={{ marginBottom: '25px' }}>Editar Perfil</h3>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Nome Completo</label>
                <input 
                  className="form-control" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>E-mail</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={editEmail} 
                  onChange={e => setEditEmail(e.target.value)} 
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '10px' }}
                disabled={loadingProfile}
              >
                {loadingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalistaDashboard;
