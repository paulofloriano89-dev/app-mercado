const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

// Inicializa a biblioteca oficial com a chave do Render
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

app.post('/compare', async (req, res) => {
    try {
        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
        }

        // Prepara as imagens em Base64
        const imageParts = images.map(imgBase64 => ({
            inlineData: {
                data: imgBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg'
            }
        }));

        const promptText = `Analise as etiquetas de preço enviadas e determine a opção com melhor custo-benefício (menor preço por kg, litro ou unidade).
Responda de forma direta no seguinte formato (sem formatação markdown como * ou #):

Campeão: [Nome do Produto e Peso/Volume]
Preço: R$ [Preço Total] (R$ [Preço por kg/L/unidade]/kg)
Economia: R$ [Diferença] a menos por kg em relação ao produto mais caro.`;

        // Modelo estável e rápido
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const result = await model.generateContent([promptText, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        res.json({ analysis: text });

    } catch (error) {
        console.error('Erro detalhado no servidor:', error);
        res.status(500).json({ error: 'Erro ao processar imagens no servidor. Tente novamente.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
