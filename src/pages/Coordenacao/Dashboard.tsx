import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  LogOut, 
  Users, 
  DollarSign, 
  Award,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CoordenacaoDashboard = () => {
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedAnalystId, setExpandedAnalystId] = useState<string | null>(null);

  // Form states
  const [newCpf, setNewCpf] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('analista');
  const [newPatientName, setNewPatientName] = useState('');
  const [assignedAnalistaId, setAssignedAnalistaId] = useState('');

  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  useEffect(() => {
    const unsubAuth = onSnapshot(collection(db, 'usuarios_autorizados'), (snapshot) => {
      setAuthorizedUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubReg = onSnapshot(collection(db, 'usuarios_clinica'), (snapshot) => {
      setRegisteredUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPay = onSnapshot(collection(db, 'pagamentos'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPatients = onSnapshot(collection(db, 'pacientes'), (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubAuth(); unsubReg(); unsubPay(); unsubPatients();
    };
  }, []);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCpf || !newName) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'usuarios_autorizados'), {
        cpf: newCpf.replace(/\D/g, ''),
        name: newName,
        role: newRole,
        supervisor: '',
        activeInClinic: true,
        createdAt: new Date()
      });
      setNewCpf(''); setNewName('');
      alert('Usuário autorizado!');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName || !assignedAnalistaId) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'pacientes'), {
        name: newPatientName,
        analistaUid: assignedAnalistaId,
        status: 'Ativo',
        reasonStopped: '',
        assignedAt: new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        files: []
      });
      setNewPatientName(''); setAssignedAnalistaId('');
      alert('Paciente atribuído!');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const updateMemberStatus = async (userId: string, status: boolean) => {
    try {
      await updateDoc(doc(db, 'usuarios_autorizados', userId), { activeInClinic: status });
    } catch (err: any) { alert(err.message); }
  };

  const reassignPatient = async (patientId: string, newAnalistaUid: string) => {
    if (!newAnalistaUid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'pacientes', patientId), { analistaUid: newAnalistaUid });
      alert('Responsável atualizado!');
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  const currentMonthPayments = payments.filter(p => (p.paymentDate || '').startsWith(`${currentYear}-${currentMonth}`));
  const repasseRecebido = currentMonthPayments.filter(p => p.repasseConfirmado).reduce((acc, curr) => acc + curr.repasse, 0);
  const repassePendente = currentMonthPayments.filter(p => !p.repasseConfirmado).reduce((acc, curr) => acc + curr.repasse, 0);
  const totalPacientesAtivos = patients.filter(p => p.status === 'Ativo').length;

  // Merging both lists for unified view - using document ID as key to prevent overwriting
  const technicalStaff = (() => {
    const list: any[] = [];
    const processedCpfs = new Set();

    // 1. All registered users first
    registeredUsers.forEach(ru => {
      if (ru.role === 'coordenacao') return;
      const auMatch = authorizedUsers.find(au => au.cpf === ru.cpf);
      list.push({
        id: ru.id,
        uid: ru.uid,
        name: ru.name,
        cpf: ru.cpf,
        role: ru.role || auMatch?.role || 'analista',
        activeInClinic: auMatch?.activeInClinic ?? true,
        isRegistered: true,
        activePatients: patients.filter(p => p.analistaUid === ru.uid && p.status === 'Ativo').length
      });
      if (ru.cpf) processedCpfs.add(ru.cpf);
    });

    // 2. Authorized users who haven't registered yet
    authorizedUsers.forEach(au => {
      if (au.role === 'coordenacao' || processedCpfs.has(au.cpf)) return;
      list.push({
        id: au.id,
        name: au.name,
        cpf: au.cpf,
        role: au.role || 'analista',
        activeInClinic: au.activeInClinic ?? true,
        isRegistered: false,
        activePatients: 0
      });
    });

    return list.sort((a, b) => b.activePatients - a.activePatients);
  })();

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '40px 0' }}>
      {loading && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: 'var(--secondary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        </div>
      )}
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 className="outfit">Gestão da Clínica</h1>
            <p style={{ color: 'var(--text-muted)' }}>Coordenação Práxis • {currentMonth}/{currentYear}</p>
          </div>
          <button className="btn" style={{ background: '#fee2e2', color: '#ef4444' }} onClick={() => auth.signOut()}>
            Sair <LogOut size={16} />
          </button>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #16a34a' }}>
            <div style={{ background: '#dcfce7', color: '#16a34a', padding: '12px', borderRadius: '12px' }}><DollarSign size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Repasse Recebido (Mês)</span>
              <h3 className="outfit" style={{ color: '#16a34a' }}>R$ {repasseRecebido.toFixed(2)}</h3>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid #ef4444' }}>
            <div style={{ background: '#fee2e2', color: '#ef4444', padding: '12px', borderRadius: '12px' }}><TrendingUp size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Repasse Pendente (Mês)</span>
              <h3 className="outfit" style={{ color: '#ef4444' }}>R$ {repassePendente.toFixed(2)}</h3>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--secondary)' }}>
            <div style={{ background: 'var(--accent-glow)', color: 'var(--secondary)', padding: '12px', borderRadius: '12px' }}><Users size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pacientes Ativos</span>
              <h3 className="outfit">{totalPacientesAtivos}</h3>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '30px', marginBottom: '40px' }} className="mobile-grid">
          {/* Members List */}
          <div>
            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={20} color="var(--secondary)"/> Membros da Equipe
              </h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {technicalStaff.map(analyst => (
                  <div key={analyst.id} className="glass" style={{ padding: '10px', borderRadius: '20px', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div 
                        style={{ flex: 1, cursor: 'pointer' }} 
                        onClick={() => setExpandedAnalystId(expandedAnalystId === analyst.id ? null : analyst.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h5 style={{ margin: 0 }}>{analyst.name}</h5>
                          {expandedAnalystId === analyst.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                          {!analyst.isRegistered && (
                            <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: '4px' }}>
                              Aguardando Registro
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: analyst.activeInClinic ? '#dcfce7' : '#f1f5f9', color: analyst.activeInClinic ? '#16a34a' : '#64748b' }}>
                            {analyst.activeInClinic ? 'Ativo na Clínica' : 'Inativo'}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {analyst.activePatients} pacientes ativos
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn" title="Toggle Status" style={{ padding: '6px', background: analyst.activeInClinic ? '#fee2e2' : '#dcfce7', color: analyst.activeInClinic ? '#ef4444' : '#16a34a' }} onClick={() => updateMemberStatus(analyst.id, !analyst.activeInClinic)}>
                          <UserCheck size={14}/>
                        </button>
                        <button className="btn" title="Remover" style={{ padding: '6px', background: '#f1f5f9' }} onClick={() => {
                          if(confirm('Remover autorização?')) deleteDoc(doc(db, 'usuarios_autorizados', analyst.id));
                        }}>
                          <Trash2 size={14} color="#ef4444"/>
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedAnalystId === analyst.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ borderTop: '1px solid #f1f5f9', background: '#fff', borderRadius: '0 0 20px 20px' }}
                        >
                          <div style={{ padding: '15px' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Pacientes Atribuídos:</p>
                            <div style={{ display: 'grid', gap: '8px' }}>
                              {patients.filter(p => p.analistaUid === analyst.uid).map(patient => (
                                <div key={patient.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px' }}>
                                  <div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{patient.name}</span>
                                    <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '100px', background: patient.status === 'Ativo' ? '#dcfce7' : '#fee2e2', color: patient.status === 'Ativo' ? '#16a34a' : '#ef4444' }}>{patient.status}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <a href={`/paciente/${patient.id}`} className="btn" style={{ padding: '4px 8px', fontSize: '0.65rem', background: 'var(--secondary)', color: 'white' }}>
                                      Ver Ficha
                                    </a>
                                  </div>
                                </div>
                              ))}
                              {patients.filter(p => p.analistaUid === analyst.uid).length === 0 && (
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Nenhum paciente vinculado.</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gap: '30px', alignContent: 'start' }}>
            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={20}/> Atribuir Paciente
              </h4>
              <form onSubmit={handleAddPatient}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>Nome do Paciente</label>
                  <input className="form-control" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>Responsável Técnico</label>
                  <select className="form-control" value={assignedAnalistaId} onChange={e => setAssignedAnalistaId(e.target.value)} required>
                    <option value="">Selecione...</option>
                    {registeredUsers.filter(u => u.role !== 'coordenacao').map(u => (
                      <option key={u.uid} value={u.uid}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>Finalizar Atribuição</button>
              </form>
            </div>

            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <TrendingUp size={20}/> Autorizar CPF
              </h4>
              <form onSubmit={handleAuthorize}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>Nome Completo</label>
                  <input className="form-control" value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>CPF (Apenas números)</label>
                  <input className="form-control" value={newCpf} onChange={e => setNewCpf(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>Papel</label>
                  <select className="form-control" value={newRole} onChange={e => setNewRole(e.target.value)}>
                    <option value="analista">Analista</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="coordenacao">Coordenação</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>Gerar Autorização</button>
              </form>
            </div>
          </div>
        </div>

        <div className="card" style={{ opacity: 0.8 }}>
          <h4 className="outfit" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
             Listagem Geral e Reatribuição
          </h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Paciente</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Responsável Atual</th>
                  <th style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{p.name}</td>
                    <td style={{ padding: '12px' }}>
                      <select 
                        style={{ fontSize: '0.75rem', padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'transparent' }}
                        value={p.analistaUid}
                        onChange={(e) => reassignPatient(p.id, e.target.value)}
                      >
                        {registeredUsers.filter(ru => ru.role !== 'coordenacao').map(ru => (
                          <option key={ru.uid} value={ru.uid}>{ru.name}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <a href={`/paciente/${p.id}`} style={{ color: 'var(--secondary)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600 }}>Ver Ficha →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default CoordenacaoDashboard;
