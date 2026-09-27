const express = require('express');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

// Inicializa com a chave de API das variáveis de ambiente
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

app.post('/compare', async (req, res) => {
    try {
        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada.' });
        }

        const imageParts = images.map(imgBase64 => ({
            inlineData: {
                data: imgBase64.replace(/^data:image\/\w+;base64,/, ''),
                mimeType: 'image/jpeg'
            }
        }));

        const promptText = `Analise as etiquetas de preço enviadas e determine a opção com melhor custo-benefício (menor preço por kg, litro ou unidade).
Responda de forma direta no seguinte formato (sem formatação em Markdown ou asteriscos):

Campeão: [Nome do Produto e Peso/Volume]
Preço: R$ [Preço Total] (R$ [Preço por kg/L/unidade]/kg)
Economia: R$ [Diferença] a menos por kg em relação ao produto mais caro.`;

        // Utiliza o modelo gemini-2.5-flash ou gemini-2.0-flash-lite
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [promptText, ...imageParts]
        });

        res.json({ analysis: response.text });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: 'Erro ao processar imagens no servidor.' });
    }
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
