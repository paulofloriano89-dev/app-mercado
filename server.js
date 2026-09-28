const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const genAI = new GoogleGenerativeAI(apiKey);

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(express.static('public'));

app.post('/compare', async (req, res) => {
    try {
        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
        }

        const imageParts = images.map((imgBase64) => {
            const base64Data = imgBase64.includes(',') ? imgBase64.split(',')[1] : imgBase64;
            return {
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                }
            };
        });

        const promptText = `Analise as etiquetas de preço enviadas e determine a opção com melhor custo-benefício (menor preço por kg, litro ou unidade).
Responda de forma direta no seguinte formato (sem asteriscos ou formatação markdown):

Campeão: [Nome do Produto e Peso/Volume]
Preço: R$ [Preço Total] (R$ [Preço por kg/L/unidade]/kg)
Economia: R$ [Diferença] a menos por kg em relação ao produto mais caro.`;

        // CORREÇÃO: Utilização do sufixo -latest para garantir que a API encontra o modelo
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

        const result = await model.generateContent([promptText, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        res.json({ analysis: text });

    } catch (error) {
        console.error('Erro na chamada da API:', error);
        res.status(500).json({ error: `[ERRO DA GOOGLE]: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`Servidor a correr na porta ${port}`);
});
