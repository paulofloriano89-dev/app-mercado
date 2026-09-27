const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

app.post('/compare', async (req, res) => {
    try {
        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
        }

        const imageParts = images.map(imgBase64 => ({
            inlineData: {
                data: imgBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg'
            }
        }));

        const promptText = `Analise as etiquetas de preço enviadas e determine a opção com melhor custo-benefício (menor preço por kg, litro ou unidade).
Responda no formato:
Campeão: [Nome do Produto e Peso]
Preço: R$ [Preço] (R$ [Preço/kg])
Economia: R$ [Diferença] a menos em relação ao produto mais caro.`;

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent([promptText, ...imageParts]);
        const response = await result.response;

        res.json({ analysis: response.text() });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro ao processar imagens no servidor. Tente novamente.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
