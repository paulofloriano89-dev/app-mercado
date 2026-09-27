const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { GoogleGenAI } = require('@google/genai');

const app = express();

// Configuração do multer para manter os arquivos temporariamente na memória
const upload = multer({ storage: multer.memoryStorage() });

// Inicializa a IA usando a variável de ambiente segura do Render (GEMINI_API_KEY)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Serve os arquivos estáticos da pasta 'public'
app.use(express.static('public'));

app.post('/analisar', upload.array('fotos_etiquetas'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Nenhuma foto enviada.' });
        }

        // Otimização e compressão rápida de todas as imagens recebidas usando o Sharp
        const imagensOtimizadas = await Promise.all(
            req.files.map(async (file) => {
                const bufferRedimensionado = await sharp(file.buffer)
                    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 60 })
                    .toBuffer();

                return {
                    inlineData: {
                        data: bufferRedimensionado.toString('base64'),
                        mimeType: 'image/jpeg'
                    }
                };
            })
        );

        // Prompt enviado para o modelo Gemini analisar as etiquetas e encontrar a melhor opção por proporção/preço
        const promptTexto = `Analise estas fotos de etiquetas de preços de produtos iguais ou semelhantes em tamanhos diferentes. 
        Calcule o preço por unidade de medida (por exemplo, por quilo ou por litro) para cada etiqueta. 
        Identifique claramente qual é o produto campeão (o que oferece o melhor custo-benefício/menor preço proporcional), 
        informe o valor do produto e o preço unitário correspondente. 
        Seja direto e objetivo na resposta final para exibição direta ao usuário.`;

        // Chamada real para o Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Modelo rápido e eficiente para visão computacional
            contents: [...imagensOtimizadas, promptTexto]
        });

        const respostaTexto = response.text || "Não foi possível calcular o vencedor.";

        res.json({ vencedor: respostaTexto });

    } catch (error) {
        console.error('Erro ao processar a análise:', error);
        res.status(500).json({ vencedor: 'Erro ao processar as imagens no servidor.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor a rodar na porta ${PORT}`);
});
