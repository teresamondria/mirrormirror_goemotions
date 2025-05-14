<h3 className="mb-3 text-lg font-semibold">Balanced Alternatives</h3>
<ul className="space-y-2">
  {analysis.recommendations.map((rec,i)=>(
    <li key={i} className="rounded-lg border p-3 hover:bg-gray-50">
      <a href={rec.url} target="_blank" className="font-medium underline">
        {rec.title}
      </a>
      <p className="text-xs text-gray-500">{rec.summary}</p>
    </li>
  ))}
</ul>
