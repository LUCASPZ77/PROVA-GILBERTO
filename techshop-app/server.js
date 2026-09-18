import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://lucaspz:Tchaca22@cluster0.deqgluq.mongodb.net/techshop?appName=Cluster0';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '440054836464-p2vbuej2drjaodbfjb3073i0aatrajgh.apps.googleusercontent.com';

const clienteSchema = new mongoose.Schema({ nome: String, email: String, telefone: String });
const produtoSchema = new mongoose.Schema({ produto: String, estoque: Number, total_vendido: Number });
const vendaSchema = new mongoose.Schema({ id_pedido: Number, cliente: String, total: String, status: String });

const Cliente = mongoose.model('Cliente', clienteSchema);
const Produto = mongoose.model('Produto', produtoSchema);
const Venda = mongoose.model('Venda', vendaSchema);

// Popula SOMENTE se a coleção estiver vazia
const inicializarBancoSeVazio = async () => {
  if (await Cliente.countDocuments() === 0) {
    await Cliente.insertMany([
      { nome: 'Lucas Zambelli', email: 'lucas@techshop.com', telefone: '(11) 99876-5432' },
      { nome: 'Mariana Souza', email: 'mariana.souza@gmail.com', telefone: '(21) 98765-4321' },
      { nome: 'Roberto Alves', email: 'roberto.alves@outlook.com', telefone: '(31) 97654-3210' }
    ]);
  }

  if (await Produto.countDocuments() === 0) {
    await Produto.insertMany([
      { produto: 'Notebook Dell XPS 13', estoque: 15, total_vendido: 42 },
      { produto: 'Monitor LG Ultrawide 29"', estoque: 28, total_vendido: 85 },
      { produto: 'Teclado Mecânico Keychron', estoque: 34, total_vendido: 110 },
      { produto: 'Mouse Logitech MX Master', estoque: 50, total_vendido: 95 }
    ]);
  }

  if (await Venda.countDocuments() === 0) {
    await Venda.insertMany([
      { id_pedido: 1001, cliente: 'Lucas Zambelli', total: 'R$ 7500.00', status: 'Concluído' },
      { id_pedido: 1002, cliente: 'Mariana Souza', total: 'R$ 1450.00', status: 'Concluído' },
      { id_pedido: 1003, cliente: 'Roberto Alves', total: 'R$ 620.00', status: 'Pendente' }
    ]);
  }
};

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Conectado ao MongoDB Atlas');
    await inicializarBancoSeVazio();
  })
  .catch(err => console.error('Erro no MongoDB:', err));

// Middleware: Verificar nível de acesso
const verificarNivelAcesso = (req, res, next) => {
  const nivel = req.headers['user-level'] || 'Client';
  if (nivel !== 'Admin' && ['PUT', 'POST', 'DELETE'].includes(req.method)) {
    return res.status(403).json({ erro: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
  }
  next();
};

app.get('/api/config', (req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID });
});

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ erro: 'Credencial Google não informada.' });
  }

  try {
    const resposta = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const dados = await resposta.json();
    if (!resposta.ok || (GOOGLE_CLIENT_ID && dados.aud !== GOOGLE_CLIENT_ID)) {
      return res.status(401).json({ erro: 'Credencial Google inválida.' });
    }
    res.json({ usuario: { nome: dados.name || dados.email, email: dados.email, foto: dados.picture } });
  } catch (error) {
    res.status(502).json({ erro: 'Não foi possível validar a conta Google.' });
  }
});

// Rotas de Clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes.map(c => ({
      _id: c._id.toString(),
      id: c._id.toString(),
      id_cliente: c._id.toString(),
      nome: c.nome,
      email: c.email,
      telefone: c.telefone
    })));
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

app.delete('/api/clientes/:id', verificarNivelAcesso, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ erro: 'ID de cliente inválido.' });
    }
    const cliente = await Cliente.findByIdAndDelete(req.params.id);
    if (!cliente) {
      return res.status(404).json({ erro: 'Cliente não encontrado.' });
    }
    res.json({ mensagem: 'Cliente removido com sucesso!' });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Rotas de Estoque
const obterEstoque = async (req, res) => {
  try {
    const produtos = await Produto.find();
    res.json(produtos.map(p => ({
      _id: p._id.toString(),
      id: p._id.toString(),
      id_produto: p._id.toString(),
      produto: p.produto,
      nome: p.produto,
      nome_produto: p.produto,
      estoque: p.estoque,
      estoque_atual: p.estoque,
      total_vendido: p.total_vendido,
      total_unidades_vendidas: p.total_vendido
    })));
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};

app.get('/api/estoque', obterEstoque);
app.get('/api/produtos', obterEstoque);

const salvarEstoque = async (req, res) => {
  try {
    const qtd = req.body.estoque ?? req.body.estoque_atual ?? req.body.novoEstoque;
    if (qtd === undefined || qtd === null || !Number.isInteger(Number(qtd)) || Number(qtd) < 0) {
      return res.status(400).json({ erro: 'O estoque deve ser um número inteiro maior ou igual a zero.' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ erro: 'ID de produto inválido.' });
    }
    const produtoAtualizado = await Produto.findByIdAndUpdate(
      req.params.id,
      { estoque: Number(qtd) },
      { returnDocument: 'after' }
    );
  if (!produtoAtualizado) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
  res.json({
      mensagem: 'Estoque atualizado e gravado no MongoDB!',
      produto: {
        _id: produtoAtualizado._id.toString(),
        id: produtoAtualizado._id.toString(),
        id_produto: produtoAtualizado._id.toString(),
        produto: produtoAtualizado.produto,
        nome: produtoAtualizado.produto,
        nome_produto: produtoAtualizado.produto,
        estoque: produtoAtualizado.estoque,
        estoque_atual: produtoAtualizado.estoque,
        total_vendido: produtoAtualizado.total_vendido,
        total_unidades_vendidas: produtoAtualizado.total_vendido
      }
    });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};

app.put('/api/estoque/:id', verificarNivelAcesso, salvarEstoque);
app.put('/api/produtos/:id', verificarNivelAcesso, salvarEstoque);
app.post('/api/estoque/:id', verificarNivelAcesso, salvarEstoque);
app.post('/api/produtos/:id', verificarNivelAcesso, salvarEstoque);

// Rotas de Vendas
app.get('/api/vendas', async (req, res) => {
  try {
    const vendas = await Venda.find();
    res.json(vendas.map(v => ({
      _id: v._id.toString(),
      id_pedido: v.id_pedido,
      cliente: v.cliente,
      nome_cliente: v.cliente,
      total: v.total,
      total_pedido: v.total,
      status: v.status,
      status_pedido: v.status
    })));
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// Alias para compatibilidade com o frontend
app.get('/api/relatorio-vendas', async (req, res) => {
  try {
    const vendas = await Venda.find();
    res.json(vendas.map(v => ({
      _id: v._id.toString(),
      id_pedido: v.id_pedido,
      cliente: v.cliente,
      nome_cliente: v.cliente,
      total: v.total,
      total_pedido: v.total,
      status: v.status,
      status_pedido: v.status
    })));
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));
}