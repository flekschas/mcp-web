import { z } from 'zod';
import type { ToolDefinitionZod } from '@mcp-web/types';

// ============================================================================
// Mock Tileset Catalog
// ============================================================================

interface TilesetEntry {
  uuid: string;
  filetype: string;
  datatype: string;
  name: string;
  description: string;
  coordSystem: string;
  server: string;
}

/**
 * Static tileset catalog containing all tilesets needed for the HiGlass eval
 * test cases, plus some distractors. This replaces the live API call to
 * resgen.io/api/v1/gt/paper-data/tilesets/.
 *
 * The `server` field is added so the LLM knows which server URL to use
 * when configuring tracks.
 */
const TILESET_CATALOG: TilesetEntry[] = [
  // ─── Corces et al. 2020 - Brain Chromatin ───────────────────────────
  {
    uuid: 'VLFaiSVjTjW6mkbjRjWREA',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'ExcitatoryNeurons-insertions_bin100_RIPnorm.bw',
    description: 'Excitatory neurons ATAC-seq insertions, 100bp bins, RIP normalized',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'UtUGUu9rS3yQ7Ie-YtX32g',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'InhibitoryNeurons-insertions_bin100_RIPnorm.bw',
    description: 'Inhibitory neurons ATAC-seq insertions, 100bp bins, RIP normalized',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'FBwldgSdQQWxh7R7-jemNA',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'DopaNeurons_Cluster10_AllFrags_projSUNI2_insertions_bin100_RIPnorm.bw',
    description: 'Dopaminergic neurons ATAC-seq insertions, 100bp bins, RIP normalized',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'Zz3CBDSqQ3ySrOSe2yj1eg',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'Microglia-insertions_bin100_RIPnorm.bw',
    description: 'Microglia ATAC-seq insertions, 100bp bins, RIP normalized',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'dc_SOjdCRgq_8PYf6W--7w',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'Oligodendrocytes-insertions_bin100_RIPnorm.bw',
    description: 'Oligodendrocytes ATAC-seq insertions, 100bp bins, RIP normalized',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'Nolbrk9kS3CE0jJL_7OW1g',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'Astrocytes-insertions_bin100_RIPnorm.bw',
    description: 'Astrocytes ATAC-seq insertions, 100bp bins, RIP normalized',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'UZLlJyRBScWdGQ7L1eNk_g',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'OPCs-insertions_bin100_RIPnorm.bw',
    description: 'Oligodendrocyte precursor cells ATAC-seq insertions, 100bp bins, RIP normalized',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'fyY8k9PlS-mGLnBob05_Ow',
    filetype: 'beddb',
    datatype: 'bedlike',
    name: 'H3K27ac FitHiChIP interactions',
    description: 'H3K27ac FitHiChIP chromatin interactions, hg38',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'EqSENQSXRL-EWYeBe-Y1rA',
    filetype: 'beddb',
    datatype: 'bedlike',
    name: 'Nott et al. PLAC-seq',
    description: 'Nott et al. PLAC-seq chromatin interactions, hg19',
    coordSystem: 'hg19',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'R4e7-rVfQPWTleJIJjLOEQ',
    filetype: 'beddb',
    datatype: 'bedlike',
    name: 'Microglia PLAC-seq',
    description: 'Microglia PLAC-seq chromatin interactions, hg19',
    coordSystem: 'hg19',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'JzccFAJUQEiz-0188xaWZg',
    filetype: 'beddb',
    datatype: 'bedlike',
    name: 'Neuron PLAC-seq',
    description: 'Neuron PLAC-seq chromatin interactions, hg19',
    coordSystem: 'hg19',
    server: 'https://resgen.io/api/v1',
  },

  // ─── Naish et al. 2021 - Arabidopsis ────────────────────────────────
  {
    uuid: 'A6g97cgjSjColj25q-0lSw',
    filetype: 'cooler',
    datatype: 'matrix',
    name: 'arabidopsis.1000.10000.identity.mcool',
    description: 'Arabidopsis thaliana sequence identity matrix, 1kb/10kb resolution',
    coordSystem: 'araTha1',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'XkUMnJNkRDudN-mncWO17Q',
    filetype: 'chromsizes-tsv',
    datatype: 'chromsizes',
    name: 'araTha1.chromSizes',
    description: 'Arabidopsis thaliana chromosome sizes',
    coordSystem: 'araTha1',
    server: 'https://resgen.io/api/v1',
  },

  // ─── T2T-Nurk et al. 2021 - CHM13 ──────────────────────────────────
  {
    uuid: 'V_bM34IGSlaMOGiYmZPCbw',
    filetype: 'beddb',
    datatype: 'gene-annotation',
    name: 'Gene Annotations (t2t-chm13-v1.0)',
    description: 'Gene annotations for T2T CHM13 v1.0 genome assembly',
    coordSystem: 't2t-chm13-v1.0',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'P5Hodo9FS--bLAai7Ibjrg',
    filetype: 'chromsizes-tsv',
    datatype: 'chromsizes',
    name: 't2t-chm13-v1.0.chromSizes',
    description: 'T2T CHM13 v1.0 chromosome sizes',
    coordSystem: 't2t-chm13-v1.0',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'dLD5vk5GSkmbRIJJGbB57w',
    filetype: 'cooler',
    datatype: 'matrix',
    name: 'CHM13 v1.0 self aln (strand)',
    description: 'CHM13 v1.0 self-alignment strand orientation matrix',
    coordSystem: 't2t-chm13-v1.0',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'Ctwf1pNEQo-nwL_FHIGRvA',
    filetype: 'cooler',
    datatype: 'matrix',
    name: 'CHM13 v1.0 self aln (identity)',
    description: 'CHM13 v1.0 self-alignment sequence identity matrix',
    coordSystem: 't2t-chm13-v1.0',
    server: 'https://resgen.io/api/v1',
  },

  // ─── Rhodes et al. 2020 - Cohesin/Shh ──────────────────────────────
  {
    uuid: 'DVuS61VhTG6DxKhlsTssTQ',
    filetype: 'beddb',
    datatype: 'gene-annotation',
    name: 'Gene Annotations (mm10)',
    description: 'Gene annotations for mouse mm10 genome assembly',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'O8tQOpn0RjiFrUBmrhph4A',
    filetype: 'chromsizes-tsv',
    datatype: 'chromsizes',
    name: 'mm10.chromSizes',
    description: 'Mouse mm10 chromosome sizes',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'QH2P9yu9TRayrJWSIq15Rw',
    filetype: 'beddb',
    datatype: 'bedlike',
    name: 'Enhancer_coordinates_mm10_forIlya.bed',
    description: 'Enhancer coordinates in mm10 for Shh locus analysis',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'dNj5kcXbQOyCafZwS9Q_7Q',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'Nora_Untreated_Shh_promoter_v4C.bw',
    description: 'Nora et al. untreated virtual 4C from Shh promoter viewpoint',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'FkxLccEYTDyptR9lri9dSw',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'Nora_AUX_Shh_promoter_v4C.bw',
    description: 'Nora et al. auxin-treated virtual 4C from Shh promoter viewpoint',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'ZeGL_XV7Rxi7bUy1dWeiVw',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'Nora_Washoff_Shh_promoter_v4C.bw',
    description: 'Nora et al. auxin washoff virtual 4C from Shh promoter viewpoint',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'TigjWJq3RUO6gTQoCYnYHA',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'Rhodes_Tir1_AUX_Shh_promoter_v4C.bw',
    description: 'Rhodes et al. Tir1-AUX treated virtual 4C from Shh promoter viewpoint',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'NnBQFblZQiCkqS7EM7bjEw',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'Rhodes_Scc1_AUX_Shh_promoter_v4C.bw',
    description: 'Rhodes et al. Scc1-AUX treated virtual 4C from Shh promoter viewpoint',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'H03vimpjStm1LbLUf2oFaw',
    filetype: 'cooler',
    datatype: 'matrix',
    name: 'Tir1_Aux_all_5kb_balanced.mcool',
    description: 'Rhodes et al. Tir1-AUX Hi-C contact matrix, 5kb resolution, ICE balanced',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'CiH-pKPDTQqgz4RtBFkzJg',
    filetype: 'cooler',
    datatype: 'matrix',
    name: 'Scc1_Aux_all_5kb_balanced.mcool',
    description: 'Rhodes et al. Scc1-AUX Hi-C contact matrix, 5kb resolution, ICE balanced',
    coordSystem: 'mm10',
    server: 'https://resgen.io/api/v1',
  },

  // ─── Krietenstein et al. 2019 - Micro-C ─────────────────────────────
  {
    uuid: 'E8aSzhwARdqdojnO3MxWmg',
    filetype: 'cooler',
    datatype: 'matrix',
    name: 'H1ESC Micro-C',
    description: 'H1-hESC Micro-C contact matrix from Krietenstein et al. 2019',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'Yjsni288Qz2RgG3-ujTrHg',
    filetype: 'bigwig',
    datatype: 'vector',
    name: 'GSM1022644_hg19_wgEncodeUwTfbsHffCtcfStdRawRep1.bigWig',
    description: 'CTCF ChIP-seq in human foreskin fibroblasts (ENCODE)',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'HMSJyvLCSgGmrDJctdIz3w',
    filetype: 'multivec',
    datatype: 'multivec',
    name: 'Epilogos (hg38)',
    description: 'Epilogos chromatin state annotations for hg38',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },

  // ─── Shared / Common tilesets ───────────────────────────────────────
  {
    uuid: 'ZpZ8c5JJRUS1J7ZkofcUrg',
    filetype: 'chromsizes-tsv',
    datatype: 'chromsizes',
    name: 'hg38.chromSizes',
    description: 'Human hg38 chromosome sizes',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'M9A9klpwTci5Vf4bHZ864g',
    filetype: 'beddb',
    datatype: 'gene-annotation',
    name: 'Gene Annotations (hg38)',
    description: 'Gene annotations for human hg38 genome assembly',
    coordSystem: 'hg38',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'ADfY_RtsQR6oKOMyrq6qhw',
    filetype: 'chromsizes-tsv',
    datatype: 'chromsizes',
    name: 'hg19.chromSizes',
    description: 'Human hg19 chromosome sizes',
    coordSystem: 'hg19',
    server: 'https://resgen.io/api/v1',
  },
  {
    uuid: 'NCifnbrKQu6j-ohVWJLoJw',
    filetype: 'beddb',
    datatype: 'gene-annotation',
    name: 'Gene Annotations (hg19)',
    description: 'Gene annotations for human hg19 genome assembly',
    coordSystem: 'hg19',
    server: 'https://resgen.io/api/v1',
  },

  // ─── Distractor tilesets (from higlass.io, not used in test cases) ──
  {
    uuid: 'OHJakQICQD6gTD7skx4EWA',
    filetype: 'beddb',
    datatype: 'gene-annotation',
    name: 'Gene Annotations (hg19)',
    description: 'Gene annotations for human hg19 (higlass.io mirror)',
    coordSystem: 'hg19',
    server: 'https://higlass.io/api/v1',
  },
  {
    uuid: 'CQMd6V_cRw6iCI_-Unl3PQ',
    filetype: 'cooler',
    datatype: 'matrix',
    name: 'Rao et al. (2014) GM12878 MboI (allreps) 1kb',
    description: 'GM12878 Hi-C contact matrix from Rao et al. 2014',
    coordSystem: 'hg19',
    server: 'https://higlass.io/api/v1',
  },
];

// ============================================================================
// Mock Gene Coordinate Data
// ============================================================================

interface GeneResult {
  chromosomeName: string;
  geneName: string;
  absoluteStart: number;
  absoluteEnd: number;
  relativeStart: number;
  relativeEnd: number;
  importanceScore: number;
}

/**
 * Pre-computed gene coordinates for mock gene search.
 * Keyed by lowercase gene name, then by coordinate system.
 *
 * Absolute coordinates = cumulative chromosome offset + relative position.
 */
const GENE_DATABASE: Record<string, Record<string, GeneResult>> = {
  picalm: {
    hg19: {
      chromosomeName: 'chr11',
      geneName: 'PICALM',
      // hg19 chr11 cumulative offset: 1,815,907,890
      absoluteStart: 1_901_576_103,
      absoluteEnd: 1_901_688_813,
      relativeStart: 85_668_213,
      relativeEnd: 85_780_923,
      importanceScore: 52297,
    },
    hg38: {
      chromosomeName: 'chr11',
      geneName: 'PICALM',
      // hg38 chr11 cumulative offset: 1,808,681,051
      absoluteStart: 1_894_669_537,
      absoluteEnd: 1_894_782_247,
      relativeStart: 85_988_486,
      relativeEnd: 86_101_196,
      importanceScore: 52297,
    },
  },
  shh: {
    mm10: {
      chromosomeName: 'chr5',
      geneName: 'Shh',
      // mm10 chr5 cumulative offset: 694,132,991
      absoluteStart: 722_782_766,
      absoluteEnd: 722_793_922,
      relativeStart: 28_649_775,
      relativeEnd: 28_660_931,
      importanceScore: 38000,
    },
  },
};

// ============================================================================
// Tool Schemas
// ============================================================================

const tilesetSearchInputSchema = z.object({
  search: z.string().describe('Search query to match against tileset name and description'),
  datatype: z
    .enum([
      'axis', 'matrix', 'vector', 'multivec', 'bed-value',
      'stacked-interval', '1d-projection', 'gene-annotation',
      '2d-rectangle-domains', 'chromsizes', 'bedlike',
    ])
    .describe('Filter by tileset datatype')
    .optional(),
});

const geneSearchInputSchema = z.object({
  gene: z.string().describe('Gene name to search for (e.g., PICALM, Shh)'),
  coordSystem: z
    .string()
    .describe('Coordinate system / genome assembly (e.g., hg19, hg38, mm10)')
    .optional(),
});

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * Creates mock search tools for the HiGlass eval.
 * These replace the live API calls to resgen.io and higlass.io.
 */
export function createHiglassMockTools(): ToolDefinitionZod[] {
  return [
    {
      name: 'higlass_tileset_search',
      description:
        'Search for HiGlass tilesets by name or description. Returns matching tilesets with their UUID, datatype, coordinate system, and server URL. Use the returned UUID as tilesetUid and server URL when adding tracks.',
      inputSchema: tilesetSearchInputSchema,
      handler: async (args: { search: string; datatype?: string }) => {
        const searchLower = args.search.toLowerCase();
        const results = TILESET_CATALOG.filter((t) => {
          const nameMatch = t.name.toLowerCase().includes(searchLower);
          const descMatch = t.description.toLowerCase().includes(searchLower);
          const matches = nameMatch || descMatch;
          if (args.datatype) {
            return matches && t.datatype === args.datatype;
          }
          return matches;
        });
        return {
          tilesets: results.map((t) => ({
            uuid: t.uuid,
            filetype: t.filetype,
            datatype: t.datatype,
            name: t.name,
            description: t.description,
            coordSystem: t.coordSystem,
            server: t.server,
          })),
        };
      },
    },
    {
      name: 'higlass_gene_search',
      description:
        'Search for a gene by name and get its genomic coordinates. Returns absolute coordinates that can be used as initialXDomain/initialYDomain values to navigate to the gene location. Specify coordSystem to get coordinates for a specific genome assembly.',
      inputSchema: geneSearchInputSchema,
      handler: async (args: { gene: string; coordSystem?: string }) => {
        const geneLower = args.gene.toLowerCase();
        const geneData = GENE_DATABASE[geneLower];

        if (!geneData) {
          return { genes: [] };
        }

        if (args.coordSystem) {
          const result = geneData[args.coordSystem];
          if (!result) {
            return { genes: [] };
          }
          return { genes: [result] };
        }

        // Return all coordinate systems
        return { genes: Object.values(geneData) };
      },
    },
  ];
}
