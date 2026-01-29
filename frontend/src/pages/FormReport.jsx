import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';

export default function FormReport() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isShortView = searchParams.get('view') === 'short';
    const [form, setForm] = useState(null);
    const [responses, setResponses] = useState([]);
    const [loading, setLoading] = useState(true);
    const reportRef = useRef();

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const [formRes, responsesRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/forms/${id}`, config),
                axios.get(`http://localhost:5000/api/forms/${id}/responses`, config)
            ]);

            setForm(formRes.data);
            setResponses(responsesRes.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            alert("Error fetching data");
        }
    };

    const calculateStats = (question) => {
        const stats = { total: 0, breakdown: {} };

        responses.forEach(r => {
            const answer = r.answers[question.id];
            if (answer !== undefined && answer !== null && answer !== '') {
                stats.total++;

                if (question.type === 'rating') {
                    const rating = parseInt(answer);
                    if (rating === 5) stats.breakdown['Very Good'] = (stats.breakdown['Very Good'] || 0) + 1;
                    else if (rating === 4) stats.breakdown['Good'] = (stats.breakdown['Good'] || 0) + 1;
                    else if (rating === 3) stats.breakdown['Medium'] = (stats.breakdown['Medium'] || 0) + 1;
                    else if (rating === 2) stats.breakdown['Poor'] = (stats.breakdown['Poor'] || 0) + 1;
                    else if (rating === 1) stats.breakdown['Very Poor'] = (stats.breakdown['Very Poor'] || 0) + 1;
                } else if (Array.isArray(answer)) {
                    answer.forEach(opt => {
                        stats.breakdown[opt] = (stats.breakdown[opt] || 0) + 1;
                    });
                } else {
                    stats.breakdown[answer] = (stats.breakdown[answer] || 0) + 1;
                }
            }
        });

        // Ensure keys exist for ratings
        if (question.type === 'rating') {
            ['Very Good', 'Good', 'Medium', 'Poor', 'Very Poor'].forEach(key => {
                if (!stats.breakdown[key]) stats.breakdown[key] = 0;
            });
        }

        return stats;
    };

    const downloadPDF = () => {
        const input = reportRef.current;
        html2canvas(input, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${form.title}_${isShortView ? 'short' : 'full'}_report.pdf`);
        });
    };

    if (loading) return <div className="p-8">Loading report...</div>;

    return (
        <div className="min-h-screen p-8" style={{ background: 'linear-gradient(135deg, #fff1f2 0%, #fce7f3 100%)' }}>
            <div className="max-w-5xl mx-auto mb-4 flex justify-between">
                <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">&larr; Back</button>
                <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg shadow-md hover:bg-indigo-700 font-medium transition-colors"
                >
                    Print Report
                </button>
            </div>

            <div ref={reportRef} className="max-w-5xl mx-auto bg-white p-12 shadow-lg rounded-xl border border-gray-100">
                <div className="mb-8 border-b-2 border-gray-200 pb-4">
                    <h1 className="text-4xl font-bold text-center text-gray-800 mb-6">{form.title}</h1>
                    <div className="flex justify-between text-md text-gray-600 px-2 font-medium">
                        <p>Form Creation Date: {new Date(form.createdAt).toLocaleDateString()}</p>
                        <p>Course End Date: {new Date(form.createdAt).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {form.questions.map((q, idx) => {
                        const stats = calculateStats(q);

                        // Calculate rating breakdown for histogram (1-5 stars)
                        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                        if (q.type === 'rating') {
                            responses.forEach(r => {
                                const val = parseInt(r.answers[q.id]);
                                if (val >= 1 && val <= 5) ratingCounts[val]++;
                            });
                        }

                        return (
                            <div key={q.id} className="p-6 border-2 border-gray-300 rounded-lg break-inside-avoid">
                                <h3 className="font-bold text-xl text-gray-900 mb-4">
                                    Question {idx + 1}: {q.label}
                                </h3>

                                {q.type === 'rating' ? (
                                    <div className="space-y-6">
                                        {/* Summary Stats */}
                                        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-0 bg-blue-50 p-4 rounded-lg">
                                            <div className="text-center">
                                                <p className="text-gray-500 text-sm uppercase font-semibold">Average Rating</p>
                                                <p className="text-4xl font-bold text-blue-600">
                                                    {(
                                                        (ratingCounts[5] * 5 + ratingCounts[4] * 4 + ratingCounts[3] * 3 + ratingCounts[2] * 2 + ratingCounts[1] * 1) /
                                                        (stats.total || 1)
                                                    ).toFixed(1)}
                                                    <span className="text-lg text-gray-400">/5</span>
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-gray-500 text-sm uppercase font-semibold">Total Responses</p>
                                                <p className="text-4xl font-bold text-gray-700">{stats.total}</p>
                                            </div>
                                        </div>

                                        {/* Recharts Bar Chart - Visible in All Views */}
                                        <div className="h-64 w-full flex justify-center">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: '5 Stars', value: ratingCounts[5], color: '#166534' },
                                                            { name: '4 Stars', value: ratingCounts[4], color: '#15803d' },
                                                            { name: '3 Stars', value: ratingCounts[3], color: '#facc15' },
                                                            { name: '2 Stars', value: ratingCounts[2], color: '#f97316' },
                                                            { name: '1 Star', value: ratingCounts[1], color: '#ef4444' },
                                                        ].filter(d => d.value > 0)}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={50}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    >
                                                        {[
                                                            { name: '5 Stars', color: '#166534' },
                                                            { name: '4 Stars', color: '#15803d' },
                                                            { name: '3 Stars', color: '#facc15' },
                                                            { name: '2 Stars', color: '#f97316' },
                                                            { name: '1 Star', color: '#ef4444' },
                                                        ]
                                                            .filter(d => ratingCounts[parseInt(d.name.split(' ')[0])] > 0)
                                                            .map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                            ))
                                                        }
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend verticalAlign="bottom" align="center" layout="horizontal" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                ) : (
                                    isShortView ? (
                                        <div className="text-gray-500 italic mt-2">
                                            Detailed responses hidden in short report. <span className="font-bold text-gray-700">Total: {stats.total}</span>
                                        </div>
                                    ) : (
                                        <ul className="list-disc pl-5 mt-2 space-y-1">
                                            {Object.entries(stats.breakdown).map(([key, count]) => (
                                                <li key={key} className="text-gray-800 text-lg">
                                                    {key}: <span className="font-bold">{count}</span>
                                                </li>
                                            ))}
                                            {Object.keys(stats.breakdown).length === 0 && <li className="text-gray-500 italic">No responses yet</li>}
                                        </ul>
                                    )
                                )}
                            </div>
                        );
                    })}

                    {/* Conclusion Section */}
                    {(() => {
                        let poorestQuestion = null;
                        let minAverage = Infinity;

                        form.questions.forEach(q => {
                            if (q.type === 'rating') {
                                let totalScore = 0;
                                let count = 0;
                                responses.forEach(r => {
                                    const val = parseInt(r.answers[q.id]);
                                    if (val >= 1 && val <= 5) {
                                        totalScore += val;
                                        count++;
                                    }
                                });

                                if (count > 0) {
                                    const avg = totalScore / count;
                                    if (avg < minAverage) {
                                        minAverage = avg;
                                        poorestQuestion = { ...q, average: avg };
                                    }
                                }
                            }
                        });

                        if (poorestQuestion) {
                            return (
                                <div className="mt-8 p-8 bg-red-50 border border-red-100 rounded-xl shadow-sm break-inside-avoid">
                                    <div className="flex items-start space-x-4">
                                        <div className="bg-red-100 p-3 rounded-full">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Conclusion & Recommendations</h3>
                                            <div className="text-gray-700 text-lg">
                                                Based on the collected responses, the area requiring the most immediate attention is:
                                                <div className="mt-3 p-4 bg-white border-l-4 border-red-500 rounded shadow-sm">
                                                    <p className="font-bold text-xl text-gray-800">"{poorestQuestion.label}"</p>
                                                    <p className="text-gray-500 mt-1">Average Rating: <span className="font-bold text-red-600">{poorestQuestion.average.toFixed(1)}/5</span></p>
                                                </div>
                                                <p className="mt-4 text-gray-600">
                                                    Addressing the concerns related to <span className="font-semibold">{poorestQuestion.label}</span> should be the primary focus to improve overall satisfaction.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>

                <div className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-400 text-sm">
                    Check for elements/questions
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 15mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    button { display: none !important; }
                    .min-h-screen { padding: 0 !important; background: none !important; }
                    .max-w-5xl { max-width: 100% !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
                    .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
                    .recharts-responsive-container { width: 100% !important; height: 300px !important; }
                }
            `}</style>
        </div>
    );
}
