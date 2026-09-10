'use client';

import React, {
useState,
} from 'react';

import {
Download,
Loader2,
} from 'lucide-react';

type Props = {
matchId: string;
disabled?: boolean;
className?: string;
};

export default function DownloadMatchReportButton({
matchId,
disabled = false,
className = '',
}: Props) {
const [downloading, setDownloading] =
useState(false);

const handleDownload = async () => {
if (
disabled ||
downloading
) {
return;
}

try {
  setDownloading(true);

  const response =
    await fetch(
      `/api/dashboard/matches/${matchId}/report`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

  if (!response.ok) {
    let message =
      'Unable to generate the match report.';

    try {
      const result =
        await response.json();

      if (
        typeof result?.error ===
        'string'
      ) {
        message =
          result.error;
      }
    } catch {
      // Ignore JSON parse failure.
    }

    throw new Error(message);
  }

  const blob =
    await response.blob();

  const url =
    window.URL.createObjectURL(
      blob
    );

  const anchor =
    document.createElement(
      'a'
    );

  anchor.href = url;
  anchor.download =
    'veldt-match-report.pdf';

  document.body.appendChild(
    anchor
  );

  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(
    url
  );
} catch (error) {
  console.error(
    'Match report download failed:',
    error
  );

  window.alert(
    error instanceof Error
      ? error.message
      : 'Unable to download the match report.'
  );
} finally {
  setDownloading(false);
}


};

return (
<button
type="button"
onClick={handleDownload}
disabled={
disabled ||
downloading
}
className={[
'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition',
'bg-[#234723] text-white hover:bg-[#2e5c2e]',
'disabled:cursor-not-allowed disabled:opacity-50',
className,
].join(' ')}
>
{downloading ? ( <Loader2
       size={17}
       className="animate-spin"
     />
) : ( <Download
       size={17}
     />
)}


  {downloading
    ? 'Generating Report...'
    : 'Download Match Report'}
</button>

);
}
