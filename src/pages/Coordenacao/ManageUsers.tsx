import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc, 
  updateDoc,
  getDocs 
} from 'firebase/firestore';
import { 
  Award,
  Trash2,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Edit2,
  Calendar,
  X,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ManageUsers = () => {
  const navigate = useNavigate();
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [expandedAnalystId, setExpandedAnalystId] = useState<string | null>(null);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember]: [any, any] = useState(null);

  useEffect(() => {
    const unsubAuth = onSnapshot(collection(db, 'usuarios_autorizados'), (snapshot) => {
      setAuthorizedUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubReg = onSnapshot(collection(db, 'usuarios_clinica'), (snapshot) => {
      setRegisteredUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPatients = onSnapshot(collection(db, 'pacientes'), (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubAuth(); unsubReg(); unsubPatients();
    };
  }, []);

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    try {
      const authDocRef = doc(db, 'usuarios_autorizados', editingMember.authDocId);
      await updateDoc(authDocRef, {
        name: editingMember.name,
        role: editingMember.role,
        supervisor: editingMember.supervisor || '',
        atendimentoDesde: editingMember.atendimentoDesde || ''
      });

      if (editingMember.uid) {
        const regDocRef = doc(db, 'usuarios_clinica', editingMember.uid);
        await updateDoc(regDocRef, {
          name: editingMember.name,
          email: editingMember.email,
          role: editingMember.role
        });
      }

      alert('Membro atualizado com sucesso!');
      setShowEditMemberModal(false);
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteMember = async (analyst: any) => {
    if (!confirm(`Tem certeza que deseja excluir ${analyst.name}? Esta ação removerá a autorização e o acesso do usuário, além de desvincular seus pacientes.`)) return;

    try {
      // 1. Delete authorization
      if (analyst.authDocId) {
        await deleteDoc(doc(db, 'usuarios_autorizados', analyst.authDocId));
      }

      // 2. Delete registration if exists
      if (analyst.uid) {
        await deleteDoc(doc(db, 'usuarios_clinica', analyst.id)); // Assuming analyst.id is the registered doc id (from ru.id)
      }

      // 3. Unassign patients (set back to pending or null)
      const myPatients = patients.filter(p => p.analistaUid === analyst.uid || (p.analistaCpf && p.analistaCpf === analyst.cpf));
      for (const p of myPatients) {
        await updateDoc(doc(db, 'pacientes', p.id), {
          analistaUid: '',
          analistaCpf: '',
          status: 'Aguardando'
        });
      }

      alert('Usuário e vínculos removidos com sucesso!');
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const updateMemberStatus = async (userId: string, status: boolean) => {
    try {
      await updateDoc(doc(db, 'usuarios_autorizados', userId), { activeInClinic: status });
    } catch (err: any) { alert(err.message); }
  };

  const handleSystemReset = async () => {
    if (!confirm('AVISO CRÍTICO: Esta ação irá deletar TODOS os usuários (exceto você), pacientes, prontuários, relatos e pagamentos. Deseja prosseguir com o RESET TOTAL?')) return;
    if (!confirm('ÚLTIMO AVISO: Todos os dados serão perdidos. Confirmar reset?')) return;
    
    try {
      // 1. Delete all reports
      const relatSnap = await getDocs(collection(db, 'relatos_supervisao'));
      for (const d of relatSnap.docs) await deleteDoc(d.ref);

      // 2. Delete all payments
      const paySnap = await getDocs(collection(db, 'pagamentos'));
      for (const d of paySnap.docs) await deleteDoc(d.ref);

      // 3. Delete all evolution history
      const prontSnap = await getDocs(collection(db, 'prontuarios'));
      for (const d of prontSnap.docs) await deleteDoc(d.ref);

      // 4. Reset/Delete patients
      const patSnap = await getDocs(collection(db, 'pacientes'));
      for (const d of patSnap.docs) await deleteDoc(d.ref); // Or just unassign? User said reset everything except coord.

      // 5. Delete users (except current one)
      const currentUserCpf = registeredUsers.find(ru => ru.uid === auth.currentUser?.uid)?.cpf;

      for (const au of authorizedUsers) {
        if (au.cpf !== currentUserCpf) await deleteDoc(doc(db, 'usuarios_autorizados', au.id));
      }

      for (const ru of registeredUsers) {
        if (ru.uid !== auth.currentUser?.uid) await deleteDoc(doc(db, 'usuarios_clinica', ru.id));
      }

      alert('Sistema resetado com sucesso! Apenas sua conta de coordenação foi preservada.');
    } catch (err: any) {
      alert('Erro no reset: ' + err.message);
    }
  };

  const technicalStaff = (() => {
    const list: any[] = [];
    const processedCpfs = new Set();

    registeredUsers.forEach(ru => {
      if (ru.role === 'coordenacao') return;
      const auMatch = authorizedUsers.find(au => au.cpf === ru.cpf);
      list.push({
        id: ru.id,
        uid: ru.uid,
        name: ru.name,
        email: ru.email,
        cpf: ru.cpf,
        role: ru.role || auMatch?.role || 'analista',
        activeInClinic: auMatch?.activeInClinic ?? true,
        isRegistered: true,
        atendimentoDesde: auMatch?.atendimentoDesde || '',
        supervisor: auMatch?.supervisor || '',
        authDocId: auMatch?.id,
        activePatients: patients.filter(p => (p.analistaUid === ru.uid || (p.analistaCpf && p.analistaCpf === ru.cpf)) && p.status === 'Ativo').length
      });
      if (ru.cpf) processedCpfs.add(ru.cpf);
    });

    authorizedUsers.forEach(au => {
      if (au.role === 'coordenacao' || processedCpfs.has(au.cpf)) return;
      list.push({
        id: au.id,
        name: au.name,
        cpf: au.cpf,
        role: au.role || 'analista',
        activeInClinic: au.activeInClinic ?? true,
        isRegistered: false,
        atendimentoDesde: au.atendimentoDesde || '',
        supervisor: au.supervisor || '',
        authDocId: au.id,
        activePatients: patients.filter(p => p.analistaCpf === au.cpf && p.status === 'Ativo').length
      });
    });

    return list.sort((a, b) => b.activePatients - a.activePatients);
  })();

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '40px 0' }}>
      <div className="container">
        <button onClick={() => navigate('/coordenacao')} className="btn" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'white' }}>
          <ArrowLeft size={18} /> Voltar
        </button>

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
                      <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 600 }}>
                        {analyst.role.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" title="Editar" style={{ padding: '6px', background: '#f1f5f9' }} onClick={() => {
                      setEditingMember({...analyst});
                      setShowEditMemberModal(true);
                    }}>
                      <Edit2 size={14} color="var(--primary)"/>
                    </button>
                    <button className="btn" title="Toggle Status" style={{ padding: '6px', background: analyst.activeInClinic ? '#fee2e2' : '#dcfce7', color: analyst.activeInClinic ? '#ef4444' : '#16a34a' }} onClick={() => updateMemberStatus(analyst.authDocId || analyst.id, !analyst.activeInClinic)}>
                      <UserCheck size={14}/>
                    </button>
                    <button className="btn" title="Remover" style={{ padding: '6px', background: '#f1f5f9' }} onClick={() => handleDeleteMember(analyst)}>
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
                      <div style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                          <div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>CPF</p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{analyst.cpf}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Email</p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{analyst.email || 'N/A'}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Supervisor</p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{analyst.supervisor || 'Nenhum'}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Atende desde</p>
                            <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{analyst.atendimentoDesde ? new Date(analyst.atendimentoDesde).toLocaleDateString('pt-BR') : 'N/A'}</p>
                          </div>
                        </div>

                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Pacientes Atribuídos:</p>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {patients.filter(p => p.analistaUid === analyst.uid || (p.analistaCpf && p.analistaCpf === analyst.cpf)).map(patient => (
                            <div key={patient.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: '10px' }}>
                              <div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{patient.name}</span>
                                <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '100px', background: patient.status === 'Ativo' ? '#dcfce7' : '#fee2e2', color: patient.status === 'Ativo' ? '#16a34a' : '#ef4444' }}>{patient.status}</span>
                              </div>
                              <a href={`/paciente/${patient.id}`} className="btn" style={{ padding: '4px 8px', fontSize: '0.65rem', background: 'var(--secondary)', color: 'white' }}>
                                Ver Ficha
                              </a>
                            </div>
                          ))}
                          {patients.filter(p => p.analistaUid === analyst.uid || (p.analistaCpf && analyst.cpf && p.analistaCpf === analyst.cpf)).length === 0 && (
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
          
          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #fee2e2' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '15px' }}>Zona de Perigo: Estas ações são irreversíveis.</p>
            <button 
              className="btn" 
              style={{ background: '#fee2e2', color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}
              onClick={handleSystemReset}
            >
              Resetar Sistema (Manter apenas minha conta)
            </button>
          </div>
        </div>
      </div>

      {showEditMemberModal && editingMember && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button onClick={() => setShowEditMemberModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 className="outfit" style={{ marginBottom: '25px' }}>Editar Membro</h3>
            <form onSubmit={handleUpdateMember}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nome Completo</label>
                  <input className="form-control" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} required />
                </div>
                {editingMember.isRegistered && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>E-mail</label>
                    <input type="email" className="form-control" value={editingMember.email} onChange={e => setEditingMember({...editingMember, email: e.target.value})} required />
                  </div>
                )}
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Papel</label>
                  <select className="form-control" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})}>
                    <option value="analista">Analista</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="coordenacao">Coordenação</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Supervisor Responsável</label>
                  <select className="form-control" value={editingMember.supervisor} onChange={e => setEditingMember({...editingMember, supervisor: e.target.value})}>
                    <option value="">Nenhum</option>
                    {technicalStaff.filter(s => s.role === 'supervisor').map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Atende desde</label>
                  <div style={{ position: 'relative' }}>
                    <input type="date" className="form-control" value={editingMember.atendimentoDesde} onChange={e => setEditingMember({...editingMember, atendimentoDesde: e.target.value})} />
                    <Calendar size={14} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }}>Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
