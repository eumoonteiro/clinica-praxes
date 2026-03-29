import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage, auth } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { 
  UserPlus, 
  DollarSign, 
  FileText, 
  LogOut, 
  Users, 
  TrendingUp,
  AlertCircle,
  FileUp,
  History,
  MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.5.207/pdf.worker.min.js`;

const AnalistaDashboard = () => {
  const { userData } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newPatientName, setNewPatientName] = useState('');
  const [referralDate, setReferralDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [paymentValue, setPaymentValue] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterPatientId, setFilterPatientId] = useState('');

  // Prontuarios states
  const [showProntuarioModal, setShowProntuarioModal] = useState(false);
  const [prontuarioTargetPatient, setProntuarioTargetPatient] = useState<any>(null);
  const [prontuarioContent, setProntuarioContent] = useState('');
  const [prontuarioType, setProntuarioType] = useState('Evolução Semanal');
  const [prontuarioDate, setProntuarioDate] = useState(new Date().toISOString().split('T')[0]);
  const [patientEvolutionFreq, setPatientEvolutionFreq] = useState('Semanal');
  const [isRepasseDone, setIsRepasseDone] = useState(false);
  const [prontuarios, setProntuarios] = useState<any[]>([]);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (!userData) return;

    const qPatients = query(
      collection(db, 'pacientes'), 
      where('analistaUid', '==', userData.uid)
    );
    const unsubPatients = onSnapshot(qPatients, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenação local para evitar erros de índice composto
      setPatients(data.sort((a: any, b: any) => a.name.localeCompare(b.name)));
    });

    const qPayments = query(
      collection(db, 'pagamentos'), 
      where('analistaUid', '==', userData.uid)
    );
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenação local decrescente
      setPayments(data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    const unsubProntuarios = onSnapshot(collection(db, 'prontuarios'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProntuarios(data.sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds));
    });

    return () => {
      unsubPatients();
      unsubPayments();
      unsubProntuarios();
    };
  }, [userData]);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'pacientes'), {
        name: newPatientName,
        analistaUid: userData.uid,
        status: 'Ativo',
        reasonStopped: '',
        assignedAt: referralDate,
        createdAt: new Date(),
        files: [],
        evolucaoFrequencia: patientEvolutionFreq
      });
      setNewPatientName('');
      alert('Paciente cadastrado!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !paymentValue) return;
    setLoading(true);
    try {
      const value = parseFloat(paymentValue);
      const repasse = value * 0.20;
      const patient = patients.find(p => p.id === selectedPatientId);

      await addDoc(collection(db, 'pagamentos'), {
        patientId: selectedPatientId,
        patientName: patient.name,
        analistaUid: userData.uid,
        analistaName: userData.name,
        value,
        repasse,
        paymentDate, // Nova data de recebimento
        repasseConfirmado: isRepasseDone,
        createdAt: new Date()
      });
      setPaymentValue('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setIsRepasseDone(false);
      alert('Pagamento registrado e repasse calculado!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (patientId: string, newStatus: string, reason: string = '', date: string = '') => {
    try {
      await updateDoc(doc(db, 'pacientes', patientId), {
        status: newStatus,
        reasonStopped: reason,
        endedAt: date
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddProntuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prontuarioTargetPatient || !prontuarioContent) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'prontuarios'), {
        patientId: prontuarioTargetPatient.id,
        patientName: prontuarioTargetPatient.name,
        analistaUid: userData.uid,
        analistaName: userData.name,
        content: prontuarioContent,
        type: prontuarioType,
        date: prontuarioDate,
        createdAt: new Date()
      });
      setProntuarioContent('');
      setShowProntuarioModal(false);
      alert('Prontuário registrado com sucesso!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateRepasseStatus = async (paymentId: string, status: boolean) => {
    try {
      await updateDoc(doc(db, 'pagamentos', paymentId), {
        repasseConfirmado: status
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const extractPhoneFromPDF = async (file: File): Promise<string> => {
    try {
      console.log("Extracting phone from PDF...");
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      
      // Criar um timeout para a leitura do PDF (5 segundos)
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('PDF Timeout')), 5000));
      
      const pdf: any = await Promise.race([loadingTask.promise, timeout]);
      let fullText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) { // Ler só as primeiras 3 páginas no máximo
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => (item as any).str).join(" ");
      }
      const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?\d{4}[-\s]?\d{4}|\d{4,5}[-\s]?\d{4})/;
      const match = fullText.match(phoneRegex);
      return match ? match[0].replace(/\D/g, '') : "";
    } catch (e) {
      console.warn("PDF extraction failed or timed out:", e);
      return "";
    }
  };

  const handleFileUpload = async (patientId: string, file: File) => {
    if (!file) return;
    setLoading(true);
    console.log("Iniciando upload para:", patientId);
    try {
      const storageRef = ref(storage, `pacientes/${patientId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const patient = patients.find(p => p.id === patientId);
      let extractedPhone = '';
      
      if (file.type === 'application/pdf') {
        // Tentar extrair telefone sem travar o processo principal
        extractedPhone = await extractPhoneFromPDF(file).catch(() => '');
      }

      const newFiles = [...(patient.files || []), { 
        name: file.name, 
        url, 
        date: new Date().toISOString() 
      }];
      const updateData: any = { files: newFiles };
      if (extractedPhone && !patient.phone) updateData.phone = extractedPhone;

      await updateDoc(doc(db, 'pacientes', patientId), updateData);
      alert('Arquivo processado com sucesso!');
    } catch (err: any) {
      console.error("Erro no upload:", err);
      alert("Erro ao enviar arquivo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(pay => {
    const payDate = pay.paymentDate || (pay.createdAt?.toDate ? pay.createdAt.toDate().toISOString() : '');
    const matchesYear = payDate.startsWith(filterYear);
    const matchesPatient = filterPatientId === '' || pay.patientId === filterPatientId;
    return matchesYear && matchesPatient;
  });

  const totalRepasse = filteredPayments.reduce((acc, curr) => acc + curr.repasse, 0);

  return (
    <div style={{ background: '#f0f2f5', minHeight: '100vh', padding: '40px 0', position: 'relative' }}>
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px'
        }}>
          <div className="spinner" style={{
            width: '40px', height: '40px',
            border: '4px solid #e2e8f0',
            borderTopColor: 'var(--secondary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p className="outfit" style={{ fontWeight: 600 }}>Processando arquivo...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 className="outfit">Olá, {userData?.name}</h1>
            <p style={{ color: 'var(--text-muted)' }}>Membro Analista • Práxis Clínica</p>
          </div>
          <button className="btn" style={{ background: '#fee2e2', color: '#ef4444' }} onClick={() => auth.signOut()}>
            Sair <LogOut size={18} />
          </button>
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
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Repasse Práxis em {filterYear}</span>
                <input 
                  type="number" 
                  value={filterYear} 
                  onChange={e => setFilterYear(e.target.value)}
                  style={{ border: 'none', background: 'none', fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 700, cursor: 'pointer', width: '60px' }}
                />
              </div>
              <h3 className="outfit">R$ {totalRepasse.toFixed(2)}</h3>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }} className="mobile-grid">
          {/* Column Left: Actions */}
          <div>
            <div className="card" style={{ marginBottom: '30px' }}>
              <h4 className="outfit" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><UserPlus size={20}/> Novo Atendimento</h4>
              <form onSubmit={handleAddPatient}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nome do Paciente</label>
                  <input className="form-control" placeholder="Nome Completo" value={newPatientName} onChange={e => setNewPatientName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Data de Início</label>
                  <input type="date" className="form-control" value={referralDate} onChange={e => setReferralDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Frequência de Evolução</label>
                  <select className="form-control" value={patientEvolutionFreq} onChange={e => setPatientEvolutionFreq(e.target.value)}>
                    <option value="Diária">Diária</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensal">Mensal</option>
                    <option value="Bimestral">Bimestral</option>
                  </select>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>Iniciar Atendimento</button>
              </form>
            </div>

            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><DollarSign size={20}/> Lançar Recebimento</h4>
              <form onSubmit={handleAddPayment}>
                <div className="form-group">
                  <select className="form-control" value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)} required>
                    <option value="">Selecione o Paciente</option>
                    {patients.filter(p => p.status === 'Ativo').map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Valor Recebido (R$)</label>
                  <input type="number" step="0.01" className="form-control" placeholder="0,00" value={paymentValue} onChange={e => setPaymentValue(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Data do Recebimento</label>
                  <input type="date" className="form-control" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                </div>
                <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '12px', marginBottom: '20px', fontSize: '0.9rem' }}>
                  <strong>Cálculo Automático:</strong> Repasse Práxis (20%): R$ {paymentValue ? (parseFloat(paymentValue) * 0.2).toFixed(2) : '0.00'}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isRepasseDone} onChange={e => setIsRepasseDone(e.target.checked)} />
                    Confirmar que o repasse já foi realizado
                  </label>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', background: '#16a34a' }}>Confirmar Recebimento</button>
              </form>
            </div>
          </div>

          {/* Column Right: List */}
          <div>
            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}><History size={20}/> Gestão de Atendimentos</h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {patients.map(p => (
                  <div key={p.id} className="glass" style={{ padding: '20px', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                      <div>
                        <h5 style={{ fontSize: '1.1rem' }}>{p.name}</h5>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            padding: '4px 10px', 
                            borderRadius: '100px', 
                            background: p.status === 'Ativo' ? '#dcfce7' : '#fee2e2',
                            color: p.status === 'Ativo' ? '#16a34a' : '#ef4444',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            {p.status}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Encaminhado em: {p.assignedAt ? new Date(p.assignedAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {p.phone && (
                          <a href={`https://wa.me/55${p.phone}`} target="_blank" className="btn" style={{ background: '#25d366', color: 'white', padding: '8px' }}>
                            <MessageCircle size={16}/>
                          </a>
                        )}
                        <button className="btn" style={{ padding: '8px', background: 'var(--secondary)', color: 'white' }} onClick={() => {
                          setProntuarioTargetPatient(p);
                          setShowProntuarioModal(true);
                        }}>
                          <FileText size={16}/>
                        </button>
                        <label className="btn" style={{ padding: '8px', background: 'var(--accent-glow)', color: 'var(--secondary)', cursor: 'pointer' }}>
                          <FileUp size={16}/>
                          <input type="file" style={{ display: 'none' }} onChange={e => handleFileUpload(p.id, e.target.files?.[0] as File)} />
                        </label>
                        {p.status === 'Ativo' ? (
                          <button className="btn" style={{ padding: '8px', background: '#fee2e2', color: '#ef4444' }} onClick={() => {
                            const reason = prompt('Motivo do encerramento?');
                            const date = prompt('Data do encerramento? (DD/MM/AAAA)', new Date().toLocaleDateString('pt-BR'));
                            if(reason && date) {
                              const [day, month, year] = date.split('/');
                              const isoDate = `${year}-${month}-${day}`;
                              handleStatusChange(p.id, 'Encerrado', reason, isoDate);
                            }
                          }}>
                            <AlertCircle size={16}/>
                          </button>
                        ) : (
                          <button className="btn" style={{ padding: '8px', background: '#dcfce7', color: '#16a34a' }} onClick={() => handleStatusChange(p.id, 'Ativo')}>
                            <TrendingUp size={16}/>
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                      <button 
                        className="btn" 
                        style={{ 
                          fontSize: '0.75rem', 
                          padding: '6px 12px', 
                          background: expandedPatientId === p.id ? 'var(--primary)' : '#f1f5f9',
                          color: expandedPatientId === p.id ? 'white' : 'var(--text-main)'
                        }}
                        onClick={() => setExpandedPatientId(expandedPatientId === p.id ? null : p.id)}
                      >
                        {expandedPatientId === p.id ? 'Ocultar Histórico' : 'Ver Evoluções'}
                      </button>
                    </div>

                    {expandedPatientId === p.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px', marginTop: '10px' }}
                      >
                        <h6 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.6, marginBottom: '10px' }}>Histórico de Evoluções ({p.evolucaoFrequencia}):</h6>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {prontuarios.filter(pr => pr.patientId === p.id).map(pr => (
                            <div key={pr.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid rgba(0,0,0,0.03)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{pr.type}</span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{new Date(pr.date).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-main)', opacity: 0.9 }}>{pr.content}</p>
                            </div>
                          ))}
                          {prontuarios.filter(pr => pr.patientId === p.id).length === 0 && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px' }}>Nenhum registro de evolução encontrado.</p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {p.status !== 'Ativo' && (
                      <div style={{ marginBottom: '10px' }}>
                        {p.endedAt && <p style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600 }}>Encerramento em: {new Date(p.endedAt).toLocaleDateString('pt-BR')}</p>}
                        {p.reasonStopped && <p style={{ fontSize: '0.8rem', color: '#ef4444', fontStyle: 'italic' }}>Motivo: {p.reasonStopped}</p>}
                      </div>
                    )}

                    {p.files && p.files.length > 0 && (
                      <div style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '12px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Arquivos do Paciente:</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {p.files.map((file: any, i: number) => (
                            <a key={i} href={file.url} target="_blank" className="glass" style={{ padding: '8px 12px', borderRadius: '10px', fontSize: '0.8rem', color: 'var(--secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                              <FileText size={16}/> {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginTop: '30px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', marginBottom: '25px', justifyContent: 'space-between' }}>
                <h4 className="outfit" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><DollarSign size={20}/> Histórico de Recebimentos</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select className="form-control" style={{ width: 'auto', padding: '6px 12px' }} value={filterPatientId} onChange={e => setFilterPatientId(e.target.value)}>
                    <option value="">Todos os Pacientes</option>
                    {Array.from(new Set(payments.map(p => p.patientId))).map(pid => (
                      <option key={pid} value={pid}>{payments.find(p => p.patientId === pid)?.patientName}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    className="form-control" 
                    style={{ width: '80px', padding: '6px 12px' }} 
                    value={filterYear} 
                    onChange={e => setFilterYear(e.target.value)} 
                    placeholder="Ano"
                  />
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9' }}>
                      <th style={{ padding: '12px' }}>Data Rec.</th>
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
                        <td style={{ padding: '12px', fontWeight: 700, color: '#ef4444' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span>- R$ {pay.repasse.toFixed(2)}</span>
                            <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: pay.repasseConfirmado ? '#16a34a' : '#ef4444' }}>
                              <input type="checkbox" checked={pay.repasseConfirmado} onChange={e => updateRepasseStatus(pay.id, e.target.checked)} />
                              {pay.repasseConfirmado ? 'Repasse Feito' : 'Repasse Pendente'}
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum registro encontrado para este mês.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal de Prontuário */}
      {showProntuarioModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(5px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card" 
            style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <h4 className="outfit" style={{ marginBottom: '10px' }}>Registrar Evolução Clínica</h4>
            <p style={{ color: 'var(--text-muted)', marginBottom: '25px' }}>Paciente: <strong>{prontuarioTargetPatient?.name}</strong></p>
            
            <form onSubmit={handleAddProntuario}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>Tipo de Registro</label>
                  <select className="form-control" value={prontuarioType} onChange={e => setProntuarioType(e.target.value)}>
                    <option value="Evolução Diária">Evolução Diária</option>
                    <option value="Evolução Semanal">Evolução Semanal</option>
                    <option value="Evolução Mensal">Evolução Mensal</option>
                    <option value="Evolução Bimestral">Evolução Bimestral</option>
                    <option value="Sessão Extra">Sessão Extra</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem' }}>Data da Evolução</label>
                  <input type="date" className="form-control" value={prontuarioDate} onChange={e => setProntuarioDate(e.target.value)} />
                </div>
              </div>
              
              <div className="form-group">
                <label style={{ fontSize: '0.8rem' }}>Conteúdo da Evolução (Sigiloso)</label>
                <textarea 
                  className="form-control" 
                  style={{ minHeight: '200px', resize: 'vertical' }} 
                  placeholder="Relate os avanços e pontos observados no período..."
                  value={prontuarioContent}
                  onChange={e => setProntuarioContent(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1 }}>Salvar Registro</button>
                <button type="button" className="btn" style={{ flex: 1, background: '#f1f5f9' }} onClick={() => setShowProntuarioModal(false)}>Cancelar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AnalistaDashboard;
