use std::sync::Arc;

use oxc_str::CompactStr;
use rolldown_common::{ConcatenateWrappedModuleKind, ModuleIdx, PrependRenderedImport};
use rolldown_utils::{index_vec_ext::IndexVecExt as _, rayon::ParallelIterator as _};
use rustc_hash::FxHashMap;
use tracing::debug_span;

use crate::{
  chunk_graph::ChunkGraph,
  module_finalizers::{FinalizerMutableFields, ScopeHoistingFinalizerContext},
  type_alias::IndexEcmaAst,
};

use super::GenerateStage;

impl GenerateStage<'_> {
  #[tracing::instrument(level = "debug", skip_all)]
  pub(super) fn finalize_modules(
    &mut self,
    chunk_graph: &mut ChunkGraph,
    ast_table: &mut IndexEcmaAst,
  ) {
    let has_enum_inlining = self.link_output.has_enum_inlining;

    let finalized: Vec<(ModuleIdx, FinalizerMutableFields)> = debug_span!("finalize_modules")
      .in_scope(|| {
        ast_table
          .par_iter_mut_enumerated()
          .filter(|(idx, _ast)| {
            self.link_output.module_table[*idx]
              .as_normal()
              .is_some_and(|m| self.link_output.metas[m.idx].is_included)
          })
          .filter_map(|(idx, ast)| {
            let ast = ast.as_mut()?;
            let module = self.link_output.module_table[idx].as_normal().unwrap();
            let ast_scope = &self.link_output.symbol_db[idx].as_ref().unwrap().ast_scopes;
            let chunk_idx = chunk_graph.module_to_chunk[idx].unwrap();
            let chunk = &chunk_graph.chunk_table[chunk_idx];
            let linking_info = &self.link_output.metas[module.idx];
            let ctx = ScopeHoistingFinalizerContext {
              idx,
              chunk,
              chunk_idx,
              chunk_graph,
              symbol_db: &self.link_output.symbol_db,
              linking_info,
              module,
              stmt_infos: &self.link_output.stmt_infos[idx],
              modules: &self.link_output.module_table.modules,
              linking_infos: &self.link_output.metas,
              runtime: &self.link_output.runtime,
              options: self.options,
              file_emitter: &self.plugin_driver.file_emitter,
              constant_value_map: &self.link_output.global_constant_symbol_map,
              safely_merge_cjs_ns_map: &self.link_output.safely_merge_cjs_ns_map,
              used_symbol_refs: &self.link_output.used_symbol_refs,
              resolved_paths: self.resolved_paths.as_ref(),
              has_enum_inlining,
            };
            let fields = ctx.finalize_normal_module(ast, ast_scope);
            Some((idx, fields))
          })
          .collect::<Vec<_>>()
      });

    // Collect system hoisted exports per module so render_system can batch them.
    // Store as `module_idx → Vec<(export_names, local_canonical_name)>`.
    let mut system_hoisted_exports_map: FxHashMap<ModuleIdx, Vec<(Vec<CompactStr>, CompactStr)>> =
      FxHashMap::default();

    let mut normalized_transfer_parts_rendered_maps = FxHashMap::default();
    for (idx, (transferred_import_record, rendered_concatenated_module_parts, system_hoisted)) in
      finalized
    {
      // Store hoisted exports for this module (may be empty for non-System or no hoisted exports)
      if !system_hoisted.is_empty() {
        system_hoisted_exports_map.insert(idx, system_hoisted);
      }

      let concatenated_wrapped_module_kind =
        self.link_output.metas[idx].concatenated_wrapped_module_kind;
      if !transferred_import_record.is_empty()
        || !matches!(concatenated_wrapped_module_kind, ConcatenateWrappedModuleKind::None)
      {
        for (rec_idx, rendered_string) in transferred_import_record {
          normalized_transfer_parts_rendered_maps.insert((idx, rec_idx), rendered_string);
        }
        let chunk_idx = chunk_graph.module_to_chunk[idx].expect("should have chunk idx");
        let chunk = &mut chunk_graph.chunk_table[chunk_idx];
        chunk
          .module_idx_to_render_concatenated_module
          .insert(idx, rendered_concatenated_module_parts);
      }
    }

    // Store hoisted exports on the chunk graph so render_system can access them.
    chunk_graph.system_hoisted_exports_by_module = system_hoisted_exports_map;

    if normalized_transfer_parts_rendered_maps.is_empty() {
      return;
    }
    for chunk in chunk_graph.chunk_table.iter_mut() {
      for (module_idx, recs) in &chunk.insert_map {
        let Some(module) = self.link_output.module_table[*module_idx].as_normal_mut() else {
          continue;
        };
        for (importer_idx, rec_idx) in recs {
          if let Some(rendered_string) =
            normalized_transfer_parts_rendered_maps.get(&(*importer_idx, *rec_idx))
          {
            module
              .ecma_view
              .mutations
              .push(Arc::new(PrependRenderedImport { intro: rendered_string.clone() }));
          }
        }
      }
    }
  }
}
