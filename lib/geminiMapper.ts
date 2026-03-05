import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MappingResult, FormSchema } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('Gemini API key not configured. AI features will be disabled.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * 使用 Gemini 2.0 Flash 将混沌数据映射到表单字段
 * @param userInput 用户输入的原始数据
 * @param formSchema 目标表单的结构
 * @returns AI 映射结果
 */
export const mapDataToForm = async (
  userInput: string,
  formSchema: FormSchema
): Promise<MappingResult[]> => {
  if (!genAI) {
    throw new Error('Gemini API not configured');
  }
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      responseMimeType: 'application/json',
    }
  });
  
  const prompt = `你是一个智能表单填充助手。你的任务是将用户提供的原始数据精准映射到目标表单的字段中。

**用户输入的原始数据：**
\`\`\`
${userInput}
\`\`\`

**目标表单结构：**
\`\`\`json
${JSON.stringify(formSchema.fields, null, 2)}
\`\`\`

**要求：**
1. 从原始数据中提取与表单字段相关的信息
2. 为每个字段提供映射值和置信度评分（0-1）
3. 如果置信度 < 0.8，请在 reasoning 中说明原因
4. 不要编造数据，如果找不到匹配信息，返回空值

**输出格式（JSON Array）：**
[
  {
    "field": "表单字段的 selector",
    "value": "提取的值",
    "confidence": 0.95,
    "reasoning": "为什么这么匹配的原因"
  }
]

请开始分析并输出 JSON：`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // 解析 JSON 响应
    const mappings: MappingResult[] = JSON.parse(text);
    
    return mappings;
  } catch (error) {
    console.error('Gemini mapping failed:', error);
    throw new Error('AI mapping failed. Please try again.');
  }
};

/**
 * 使用 Gemini Vision 处理图片 OCR
 * @param imageBase64 Base64 编码的图片
 * @returns 提取的文本
 */
export const extractTextFromImage = async (imageBase64: string): Promise<string> => {
  if (!genAI) {
    throw new Error('Gemini API not configured');
  }
  
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `请提取图片中的所有文字内容，保持原有格式和结构。
如果图片包含表格或结构化数据，请使用合适的格式保留其结构。
如果是合同、发票、证件等文档，请特别注意关键字段的提取。

请直接输出提取的文字，不要添加任何解释或注释。`;
  
  const imageParts = [
    {
      inlineData: {
        data: imageBase64.split(',')[1], // 移除 data:image/...;base64, 前缀
        mimeType: 'image/jpeg',
      },
    },
  ];
  
  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Vision extraction failed:', error);
    throw new Error('Image text extraction failed.');
  }
};
