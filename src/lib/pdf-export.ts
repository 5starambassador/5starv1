'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReportColumn {
    header: string
    dataKey: string
}

interface ReportOptions {
    title: string
    subtitle?: string
    columns: ReportColumn[] | string[]  // Support both formats
    data: Record<string, any>[] | any[][] // Support both formats
    fileName?: string
}


/**
 * Generate a branded PDF report with table data
 */
export function generatePDFReport(options: ReportOptions) {
    const { title, subtitle, columns, data, fileName = 'report' } = options

    const doc = new jsPDF()

    // Brand Colors
    const brandRed: [number, number, number] = [204, 0, 0]
    const brandGold: [number, number, number] = [255, 217, 54]

    // Header
    doc.setFillColor(...brandRed)
    doc.rect(0, 0, 210, 35, 'F')

    // Logo Area (placeholder text)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('ACHARIYA', 14, 18)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('5-Star Ambassador Program', 14, 26)

    // Title
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, 50)

    // Subtitle
    if (subtitle) {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        doc.text(subtitle, 14, 58)
    }

    // Generated Date
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`, 14, 66)

    // Detect format and build table data
    const isSimpleFormat = typeof columns[0] === 'string'

    let tableHead: string[]
    let tableBody: any[][]

    if (isSimpleFormat) {
        // Simple format: columns are strings, data is array of arrays
        tableHead = columns as string[]
        tableBody = data as any[][]
    } else {
        // Object format: columns have header/dataKey, data is array of objects
        const cols = columns as ReportColumn[]
        tableHead = cols.map(c => c.header)
        tableBody = (data as Record<string, any>[]).map(row => cols.map(c => row[c.dataKey] ?? '-'))
    }

    // Table
    autoTable(doc, {
        startY: 75,
        head: [tableHead],
        body: tableBody,
        headStyles: {
            fillColor: brandRed,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250]
        },
        styles: {
            fontSize: 9,
            cellPadding: 4
        },
        margin: { left: 14, right: 14 }
    })

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
            `Page ${i} of ${pageCount} | Achariya Ambassador Portal`,
            105,
            doc.internal.pageSize.height - 10,
            { align: 'center' }
        )
    }

    // Download
    doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`)
}

/**
 * Quick export for referrals table
 */
export function exportReferralsToPDF(referrals: any[], ambassadorName: string) {
    generatePDFReport({
        title: 'Referrals Report',
        subtitle: `Ambassador: ${ambassadorName}`,
        fileName: `referrals_${ambassadorName.replace(/\s/g, '_').toLowerCase()}`,
        columns: [
            { header: 'Student Name', dataKey: 'studentName' },
            { header: 'Parent Name', dataKey: 'parentName' },
            { header: 'Mobile', dataKey: 'parentMobile' },
            { header: 'Campus', dataKey: 'preferredCampus' },
            { header: 'Status', dataKey: 'status' },
            { header: 'Date', dataKey: 'createdAt' }
        ],
        data: referrals.map(r => ({
            ...r,
            createdAt: new Date(r.createdAt).toLocaleDateString('en-IN')
        }))
    })
}

/**
 * Quick export for users/ambassadors table
 */
export function exportUsersToPDF(users: any[], reportTitle: string = 'Users Report') {
    generatePDFReport({
        title: reportTitle,
        fileName: reportTitle.replace(/\s/g, '_').toLowerCase(),
        columns: [
            { header: 'Name', dataKey: 'fullName' },
            { header: 'Mobile', dataKey: 'mobileNumber' },
            { header: 'Role', dataKey: 'role' },
            { header: 'Referral Code', dataKey: 'referralCode' },
            { header: 'Total Referrals', dataKey: 'totalReferrals' },
            { header: 'Status', dataKey: 'benefitStatus' }
        ],
        data: users
    })
}
